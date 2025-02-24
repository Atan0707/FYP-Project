'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import LoginForm from "./form"

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full">
      {/* Logo/Text placeholder */}
      <div className="absolute top-4 left-4 z-10">
        <Link href="/" className="text-2xl font-bold text-white hover:opacity-80 transition-opacity">
          i-FAMS
        </Link>
      </div>

      {/* Main content */}
      <div className="flex min-h-screen">
        {/* Left side with background */}
        <div className="hidden lg:flex lg:w-1/2 relative">
          <Image
            src="/assets/blue-background.jpg"
            alt="Background"
            fill
            className="object-cover"
            loading="eager"
            priority={true}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl font-bold text-white">
              Welcome Back!
            </h1>
          </div>
        </div>

        {/* Right side with form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Log in to your account</CardTitle>
              <p className="text-sm text-center text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}