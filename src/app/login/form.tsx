'use client';

import { useState } from 'react';
import { login, verifyEmailLogin, resendVerificationCodeLogin, initiatePasswordReset, verifyResetCode, completePasswordReset } from './actions';
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, KeyRound, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const verificationSchema = z.object({
  email: z.string().email("Invalid email address"),
  verificationCode: z.string().length(5, "Verification code must be 5 digits")
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const verifyCodeSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().length(5, "Reset code must be 5 digits"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;
type VerificationValues = z.infer<typeof verificationSchema>;
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
type VerifyCodeValues = z.infer<typeof verifyCodeSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function LoginForm() {
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showVerification, setShowVerification] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [showVerifyCode, setShowVerifyCode] = useState<boolean>(false);
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const router = useRouter();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const verificationForm = useForm<VerificationValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      email: "",
      verificationCode: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const verifyCodeForm = useForm<VerifyCodeValues>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      email: "",
      token: "",
    },
  });

  const resetPasswordForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      token: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setError('');
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const result = await login(formData);
      
      if (result.error) {
        setError(result.error);
        toast.error("Login failed");
      } else if (result.requiresVerification) {
        setUserEmail(result.email);
        verificationForm.setValue('email', result.email);
        setShowVerification(true);
        toast.info(result.message);
      } else {
        toast.success("Login successful");
        setTimeout(() => {
          router.push('/pages/dashboard');
        }, 1000);
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
      toast.error("Login failed");
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function onVerificationSubmit(values: VerificationValues) {
    setError('');
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('verificationCode', values.verificationCode);

      const result = await verifyEmailLogin(formData);
      if (result.error) {
        setError(result.error);
        toast.error("Verification failed");
      } else {
        toast.success("Email verified successfully!");
        setTimeout(() => {
          router.push('/pages/dashboard');
        }, 1000);
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
      toast.error("Verification failed");
      console.error('Verification error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('email', userEmail);

      const result = await resendVerificationCodeLogin(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("New verification code sent!");
      }
    } catch (error) {
      toast.error("Failed to resend code");
      console.error('Resend error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleBackToLogin() {
    setShowVerification(false);
    setError('');
    verificationForm.reset();
  }

  async function onForgotPasswordSubmit(values: ForgotPasswordValues) {
    setError('');
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('email', values.email);

      const result = await initiatePasswordReset(formData);
      if (result.error) {
        setError(result.error);
        toast.error("Failed to send reset email");
      } else {
        toast.success("If your email is registered, you will receive a reset code");
        setUserEmail(values.email);
        setShowForgotPassword(false);
        setShowVerifyCode(true);
        verifyCodeForm.setValue('email', values.email);
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
      toast.error("Failed to send reset email");
      console.error('Forgot password error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function onVerifyCodeSubmit(values: VerifyCodeValues) {
    setError('');
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('token', values.token);

      const result = await verifyResetCode(formData);
      if (result.error) {
        setError(result.error);
        toast.error("Verification failed");
      } else {
        toast.success("Code verified successfully!");
        setShowVerifyCode(false);
        setShowResetPassword(true);
        resetPasswordForm.setValue('email', values.email);
        resetPasswordForm.setValue('token', values.token);
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
      toast.error("Verification failed");
      console.error('Verification error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function onResetPasswordSubmit(values: ResetPasswordValues) {
    setError('');
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('token', values.token);
      formData.append('newPassword', values.newPassword);

      const result = await completePasswordReset(formData);
      if (result.error) {
        setError(result.error);
        toast.error("Password reset failed");
      } else {
        toast.success("Password reset successfully!");
        setShowResetPassword(false);
        resetPasswordForm.reset();
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
      toast.error("Password reset failed");
      console.error('Reset password error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (showVerification) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Check Your Email</h2>
          <p className="text-muted-foreground mb-4">
            We&apos;ve sent a 5-digit verification code to <strong>{userEmail}</strong>
          </p>
        </div>

        <Form {...verificationForm}>
          <form onSubmit={verificationForm.handleSubmit(onVerificationSubmit)} className="space-y-4">
            <FormField
              control={verificationForm.control}
              name="verificationCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter 5-digit code" 
                      disabled={isLoading}
                      maxLength={5}
                      className="text-center text-lg tracking-widest"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Login"
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the code?
          </p>
          <Button 
            variant="outline" 
            onClick={handleResendCode}
            disabled={isLoading}
            className="w-full"
          >
            Resend Code
          </Button>
        </div>

        <Button 
          variant="ghost" 
          onClick={handleBackToLogin}
          disabled={isLoading}
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="your.email@example.com" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter your password" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Log In"
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-4 text-center">
        <Button 
          variant="link" 
          onClick={() => {
            setShowForgotPassword(true);
            form.setValue('email', form.getValues('email'));
            forgotPasswordForm.setValue('email', form.getValues('email'));
          }}
          className="text-sm"
        >
          Forgot your password?
        </Button>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your email address and we&apos;ll send you a code to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center mb-4">
              <KeyRound className="h-12 w-12 text-primary mx-auto mb-4" />
            </div>
            <Form {...forgotPasswordForm}>
              <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                <FormField
                  control={forgotPasswordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your.email@example.com" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Code"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify Code Dialog */}
      <Dialog open={showVerifyCode} onOpenChange={setShowVerifyCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Reset Code</DialogTitle>
            <DialogDescription>
              Enter the 5-digit code sent to your email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center mb-4">
              <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a 5-digit code to <strong>{userEmail}</strong>
              </p>
            </div>
            <Form {...verifyCodeForm}>
              <form onSubmit={verifyCodeForm.handleSubmit(onVerifyCodeSubmit)} className="space-y-4">
                <FormField
                  control={verifyCodeForm.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reset Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter 5-digit code" 
                          {...field} 
                          disabled={isLoading}
                          maxLength={5}
                          className="text-center text-lg tracking-widest"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </Button>
              </form>
            </Form>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the code?
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  const formData = new FormData();
                  formData.append('email', userEmail);
                  initiatePasswordReset(formData);
                  toast.success("New code sent to your email");
                }}
                disabled={isLoading}
                className="w-full"
              >
                Resend Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPassword} onOpenChange={setShowResetPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set New Password</DialogTitle>
            <DialogDescription>
              Your code has been verified. Please enter your new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Code verified successfully! Now set your new password.
              </p>
            </div>
            <Form {...resetPasswordForm}>
              <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                <FormField
                  control={resetPasswordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={resetPasswordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 