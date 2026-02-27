"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import useUser from "@/lib/users/useUser";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUploadFile } from "@better-upload/client";
import { UploadButton } from "@/components/ui/upload-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
});

type ProfileFormValues = z.infer<typeof formSchema>;

function ProfileAvatarUpload({ mutate }: { mutate: () => void }) {
  const { control } = useUploadFile({
    route: "avatar",
    onUploadComplete: async ({ metadata }) => {
      const url = metadata?.url as string | undefined;
      if (url) {
        try {
          const { error } = await authClient.updateUser({ image: url });
          if (error) {
            toast.error(error.message);
          } else {
            await mutate();
            toast.success("Avatar updated");
          }
        } catch {
          toast.error("Failed to update avatar");
        }
      }
    },
    onError: (error) => {
      toast.error(`Error uploading: ${error.message}`);
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <UploadButton control={control} accept="image/*">
        Upload avatar
      </UploadButton>
      <p className="text-xs text-muted-foreground">
        Max file size: 2MB. Supported formats: JPG, PNG.
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const { user, mutate } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
      });
    }
  }, [user, form]);

  async function onSubmit(values: ProfileFormValues) {
    try {
      setIsSubmitting(true);

      const { error } = await authClient.updateUser({
        name: values.name,
      });

      if (error) {
        throw new Error(error.message);
      }

      await mutate(); // Refresh user data
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Update your profile picture.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user?.image || undefined} />
            <AvatarFallback className="text-xl">
              {user?.name ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <ProfileAvatarUpload mutate={mutate} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
