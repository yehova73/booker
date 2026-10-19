"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getUserFromSession } from "./account";
// import { emailService } from "@/lib/emails/email-service";
import { ServerActionResponse } from "@/hooks/use-server-action";

export const sendChangeEmailRequest = async (
  newEmail: string,
  password?: string,
) => {
  const user = await getUserFromSession();

  const originalUser = await prisma.user.findFirst({
    where: {
      id: user!.id,
    },
    select: {
      email: true,
      password: true,
    },
  });

  if (!originalUser) {
    throw new Error("User not found.");
  }

  if (originalUser.email === newEmail) {
    throw new Error("Please provide another email.");
  }

  if (originalUser.password) {
    if (!password) {
      throw new Error("Please confirm your current password.");
    }

    const validPassword = await bcrypt.compare(password, originalUser.password);
    if (!validPassword) {
      throw new Error("Incorrect password.");
    }
  }

  await prisma.changeEmailToken.updateMany({
    where: {
      userId: user!.id,
    },
    data: {
      invalidatedAt: new Date(),
    },
  });

  const changeEmailToken = await prisma.changeEmailToken.create({
    data: {
      newEmail,
      userId: user!.id,
    },
  });

  const verifyChangeRequestUrl = `${
    process.env.NEXTAUTH_URL
  }/change-email?token=${changeEmailToken.id}&oldEmail=${originalUser?.email}`;

  console.log("verifyChangeRequestUrl", verifyChangeRequestUrl);
  // await emailService.sendChangeEmailRequestEmail({
  //   name: user!.name || "",
  //   email: newEmail,
  //   url: verifyChangeRequestUrl,
  // });

  return true;
};

export const sendChangeEmailRequestAction = async (
  email: string,
  password?: string,
): Promise<ServerActionResponse<null>> => {
  try {
    await sendChangeEmailRequest(email, password);
    return {
      status: "ok",
      message: {
        title: `Verification link sent to ${email}`,
      },
    };
  } catch (error) {
    return {
      status: "error",
      message: {
        title:
          error instanceof Error
            ? error.message
            : "Failed to send verification link",
      },
    };
  }
};

export const verifyChangeEmailRequestAction = async (data: {
  oldEmail: string;
  tokenId: string;
}) => {
  const { oldEmail, tokenId } = data;

  const changeEmailToken = await prisma.changeEmailToken.findFirst({
    where: {
      id: tokenId,
      user: {
        email: oldEmail,
      },
    },
  });

  if (!changeEmailToken || changeEmailToken.invalidatedAt) {
    // throw new Error("Invalid request!");
    return false;
  }

  if (
    changeEmailToken.createdAt.valueOf() + 1 * 24 * 60 * 60 * 1000 <
    new Date().valueOf()
  ) {
    return false;
  }

  const userResult = await prisma.user.update({
    where: {
      id: changeEmailToken.userId,
    },
    data: {
      email: changeEmailToken.newEmail,
    },
  });

  await prisma.changeEmailToken.updateMany({
    where: {
      userId: changeEmailToken.userId,
      id: {
        not: tokenId,
      },
    },
    data: {
      invalidatedAt: new Date(),
    },
  });

  await prisma.changeEmailToken.update({
    where: {
      id: tokenId,
    },
    data: {
      changedAt: new Date(),
    },
  });

  // await emailService.sendEmailChangeConfirmationEmail({
  //   email: changeEmailToken.newEmail,
  //   name: userResult.name || "",
  // });
  return userResult.email;
};
