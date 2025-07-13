'use client';

import { useState } from 'react';
import { signUp, verifyEmail, resendVerificationCode } from './actions';
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
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  ic: z.string()
    .min(1, "IC number is required")
    .refine(
      (value) => {
        // Malaysian IC format: YYMMDD-PB-###G (12 digits with or without dashes)
        const cleanedValue = value.replace(/-/g, '');
        
        // Check if it's 12 digits
        if (!/^\d{12}$/.test(cleanedValue)) return false;
        
        // Extract date part (first 6 digits)
        const year = parseInt(cleanedValue.substring(0, 2));
        const month = parseInt(cleanedValue.substring(2, 4));
        const day = parseInt(cleanedValue.substring(4, 6));
        
        // Validate date
        const currentYear = new Date().getFullYear() % 100;
        const century = year > currentYear ? 1900 : 2000;
        const fullYear = century + year;
        
        const date = new Date(fullYear, month - 1, day);
        const isValidDate = date.getFullYear() === fullYear && 
                            date.getMonth() === month - 1 && 
                            date.getDate() === day;
        
        // Month should be between 1-12, day should be valid for the month
        return month >= 1 && month <= 12 && isValidDate;
      },
      "Please enter a valid Malaysian IC number"
    ),
  phone: z.string().min(1, "Phone number is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters"),
    // .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    // .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    // .regex(/[0-9]/, "Password must contain at least one number")
  confirmPassword: z.string().min(1, "Password confirmation is required")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const verificationSchema = z.object({
  email: z.string().email("Invalid email address"),
  verificationCode: z.string().length(5, "Verification code must be 5 digits")
});

type FormValues = z.infer<typeof formSchema>;
type VerificationValues = z.infer<typeof verificationSchema>;

// Function to convert string to Title Case
const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function SignUpForm() {
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showVerification, setShowVerification] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      ic: "",
      phone: "",
      password: "",
      confirmPassword: "",
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
      
      // Convert fullName to Title Case
      const titleCaseName = toTitleCase(values.fullName);
      
      // Add all form values to formData, with fullName in Title Case
      formData.append('fullName', titleCaseName);
      formData.append('email', values.email);
      formData.append('ic', values.ic);
      formData.append('phone', values.phone);
      formData.append('password', values.password);

      const result = await signUp(formData);
      if (result.error) {
        setError(result.error);
        toast.error("Sign up failed");
      } else if (result.requiresVerification) {
        setUserEmail(values.email);
        verificationForm.setValue('email', values.email);
        setShowVerification(true);
        toast.success("Verification email sent!");
      } else {
        toast.success("Account created successfully");
        setTimeout(() => {
          router.push('/login');
        }, 1000);
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
      toast.error("Sign up failed");
      console.error('Signup error:', error);
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

      const result = await verifyEmail(formData);
      if (result.error) {
        setError(result.error);
        toast.error("Verification failed");
      } else {
        toast.success("Email verified successfully!");
        setTimeout(() => {
          router.push('/login');
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

      const result = await resendVerificationCode(formData);
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

  function handleBackToSignup() {
    setShowVerification(false);
    setError('');
    verificationForm.reset();
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
                "Verify Email"
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
          onClick={handleBackToSignup}
          disabled={isLoading}
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sign Up
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your full name" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
          name="ic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IC Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter your IC number" {...field} disabled={isLoading} />
              </FormControl>
              <div className="text-xs text-muted-foreground">
                Enter your Malaysian IC number (with or without dashes)
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="Enter your phone number" {...field} disabled={isLoading} />
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
                <Input type="password" placeholder="Create a strong password" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Confirm your password" {...field} disabled={isLoading} />
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
              Signing up...
            </>
          ) : (
            "Sign Up"
          )}
        </Button>
      </form>
    </Form>
  );
} 