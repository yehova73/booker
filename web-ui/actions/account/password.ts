"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getUserFromSession } from "./account";
import { ServerActionResponse } from "@/hooks/use-server-action";
// import { emailService } from "@/lib/emails/email-service";

export const updatePasswordAction = async (data: {
  oldPassword: string;
  newPassword: string;
}): Promise<ServerActionResponse<null>> => {
  const user = await getUserFromSession();
  const detailedUser = await prisma.user.findUnique({
    where: { id: user!.id },
  });

  if (detailedUser!.password) {
    const passwordMatch = await bcrypt.compare(
      data.oldPassword,
      detailedUser!.password || "",
    );

    if (!passwordMatch) {
      throw new Error("Old password is incorrect!");
    }
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, 10);

  await prisma.user.update({
    where: {
      id: detailedUser!.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  return {
    status: "ok",
    requireRefresh: true,
    message: {
      title: "Password Updated",
      description: "Your password has been updated successfully.",
    },
  };
};

export const sendResetPasswordRequestAction = async (
  email: string,
): Promise<ServerActionResponse<null>> => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      await prisma.changePasswordToken.updateMany({
        where: {
          userId: user.id,
        },
        data: {
          invalidatedAt: new Date(),
        },
      });
      const changePasswordToken = await prisma.changePasswordToken.create({
        data: {
          userId: user.id,
        },
      });
      // await emailService.sendForgotPasswordEmail({
      //   email: user.email || "",
      //   name: user.name || "",
      //   url: `${process.env.NEXTAUTH_URL}/reset-password?token=${changePasswordToken.id}`,
      // });
    }
    return { status: "ok" };
  } catch {
    return { status: "ok" };
  }
};

export const verifyResetPasswordTokenAction = async (token: string) => {
  const changePasswordToken = await prisma.changePasswordToken.findFirst({
    where: {
      id: token,
    },
  });
  if (!changePasswordToken || changePasswordToken.invalidatedAt) {
    return false;
  }
  if (
    changePasswordToken.createdAt.valueOf() + 1 * 24 * 60 * 60 * 1000 <
    new Date().valueOf()
  ) {
    return false;
  }
  return true;
};

export const confirmResetPasswordAction = async (params: {
  passowrd: string;
  tokenId: string;
}) => {
  const { passowrd, tokenId } = params;
  try {
    const changePasswordToken = await prisma.changePasswordToken.findFirst({
      where: {
        id: tokenId,
      },
    });
    if (!changePasswordToken || changePasswordToken.invalidatedAt) {
      return false;
      // throw new Error("Invalid token!");
    }

    if (
      changePasswordToken.createdAt.valueOf() + 1 * 24 * 60 * 60 * 1000 <
      new Date().valueOf()
    ) {
      return false;
      // throw new Error(
      //   "Request expired! Please make a new request from the login screen"
      // );
    }
    const hashedPassword = await encryptPassword(passowrd);

    const user = await prisma.user.update({
      where: {
        id: changePasswordToken.userId,
      },
      data: {
        password: hashedPassword,
      },
    });

    if (!user.email) {
      return false;
    }

    await prisma.changePasswordToken.update({
      where: {
        id: changePasswordToken.id,
      },
      data: {
        changedAt: new Date(),
        invalidatedAt: new Date(),
      },
    });
    // await emailService.sendPasswordChangeConfirmationEmail({
    //   email: user.email,
    //   name: user.name || "",
    // });
    return true;
  } catch {
    return false;
  }
};

const encryptPassword = async (passowrd: string) =>
  await bcrypt.hash(passowrd, 10);
