"use server";

import { authOptions } from "@/lib/auth";
// import { emailService } from "@/lib/emails/email-service";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { ServerActionResponse } from "@/hooks/use-server-action";
import { sendChangeEmailRequest } from "./email-change";

export const getUserFromSession = async () => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new Error("No user found!");
  }

  return {
    ...session?.user,
  };
};

export const getPotentialUserFromSession = async () => {
  const session = await getServerSession(authOptions);

  return session?.user;
};

export const updateUserAccountAction = async (data: {
  newName: string;
  newEmail: string;
}): Promise<
  ServerActionResponse<{
    updateName?: string;
    hasSendEmailChangeRequest?: boolean;
  }>
> => {
  const user = await getUserFromSession();
  const existingUser = await prisma.user.findUnique({
    where: { id: user!.id },
  });

  let hasSendEmailChangeRequest = false;
  if (data.newEmail !== existingUser!.email) {
    await sendChangeEmailRequest(data.newEmail);
    hasSendEmailChangeRequest = true;
  }

  const res = await prisma.user.update({
    where: { id: existingUser!.id },
    data: {
      name: data.newName,
    },
  });

  return {
    status: "ok",
    requireRefresh: false,
    message: {
      title: "Account Updated",
      description: hasSendEmailChangeRequest
        ? "A confirmation email has been sent to your new email address."
        : "Your account has been updated successfully.",
    },
    data: {
      updateName: res.name || undefined,
      hasSendEmailChangeRequest,
    },
  };
};

export async function createUserAction(data: {
  name: string;
  email: string;
  password: string;
}): Promise<
  ServerActionResponse<{
    id: string;
    email: string;
    name: string;
    password: string;
  }>
> {
  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  const { password } = data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (existingUser.accountClaimed) {
      return {
        status: "error",
        message: { title: "Email already registered." },
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const claimedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name,
        password: hashedPassword,
        accountClaimed: true,
      },
    });

    await handleNewUserFields(claimedUser.id);
    // await emailService.sendWelcomeEmail({
    //   email: claimedUser.email,
    //   name: claimedUser.name || "",
    // });

    return {
      status: "ok",
      data: {
        id: claimedUser.id,
          email: claimedUser.email ?? email,
        name: claimedUser.name || "",
        password: claimedUser.password || "",
      },
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      accountClaimed: true,
    },
  });

  if (!user) {
    return {
      status: "error",
      message: { title: "Failed to create account! Please try again." },
    };
  }

  await handleNewUserFields(user.id);

  // if (user.email) {
  //   await emailService.sendWelcomeEmail({
  //     email: user.email,
  //     name: user.name || "",
  //   });
  // }

  return {
    status: "ok",
    data: {
      id: user.id,
      email: user.email ?? email,
      name: user.name || "",
      password: user.password || "",
    },
  };
}

export const handleNewUserFields = async (userId: string) => {
  const initialUser = await prisma.user.update({
    where: { id: userId },
    data: {
      userQuickStartActions: {},
    },
  });
  if (!initialUser.image) {
    await prisma.user.update({
      where: { id: initialUser.id },
      data: {
        image: `https://api.dicebear.com/10.x/clay/svg?seed=${initialUser.name || initialUser.id}`,
      },
    });
  }
};
