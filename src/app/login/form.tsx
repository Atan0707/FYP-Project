'use client';

import { useState } from 'react';
import { login, verifyEmailLogin, resendVerificationCodeLogin } from './actions';
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
import { Loader2, Mail, ArrowLeft } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const verificationSchema = z.object({
  email: z.string().email("Invalid email address"),
  verificationCode: z.string().length(5, "Verification code must be 5 digits")
});

type FormValues = z.infer<typeof formSchema>;
type VerificationValues = z.infer<typeof verificationSchema>;

export default function LoginForm() {
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showVerification, setShowVerification] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userFullName, setUserFullName] = useState<string>('');
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
        setUserFullName(result.fullName);
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

  if (showVerification) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Email Verification Required</h2>
          <p className="text-muted-foreground mb-4">
            Hi <strong>{userFullName}</strong>, please verify your email address to complete your login.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
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
  );
} 