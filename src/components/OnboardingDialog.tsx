"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Check if the dialog has been shown before
const hasSeenOnboarding = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("hasSeenOnboarding") === "true";
};

// Set that the dialog has been shown
const setOnboardingSeen = () => {
  if (typeof window === "undefined") return;
  localStorage.setItem("hasSeenOnboarding", "true");
};

export function OnboardingDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [hasSeen, setHasSeen] = useState(true); // Default to true to prevent flash

  useEffect(() => {
    // Check if the user has seen the onboarding
    const seen = hasSeenOnboarding();
    setHasSeen(seen);
    
    // If not seen, open the dialog
    if (!seen) {
      setOpen(true);
    }
  }, []);

  const stepContent = [
    {
      title: "Welcome to Your Estate Management Dashboard",
      description:
        "This platform helps you manage your family members and assets efficiently.",
    },
    {
      title: "Track Your Family Members",
      description:
        "Add and manage your family members with detailed information and relationships.",
    },
    {
      title: "Manage Your Assets",
      description: 
        "Keep track of all your assets, their values, and assign them to family members.",
    },
    {
      title: "Ready to Get Started?",
      description:
        "Your dashboard provides a complete overview of your estate management activities.",
    },
  ];

  const totalSteps = stepContent.length;

  const handleContinue = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleDontShowAgain = () => {
    setOnboardingSeen();
    setOpen(false);
  };

  // Button to reopen the dialog
  const OpenDialogButton = () => (
    <Button 
      variant="outline" 
      size="sm" 
      className="absolute right-4 top-4 z-10"
      onClick={() => setOpen(true)}
    >
      Show Onboarding
    </Button>
  );

  return (
    <>
      {hasSeen && <OpenDialogButton />}
      
      <Dialog 
        open={open} 
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (isOpen) setStep(1);
        }}
      >
        <DialogContent className="gap-0 p-0 [&>button:last-child]:text-white">
          <div className="p-2">
            <img
              className="w-full rounded-lg"
              src="https://images.unsplash.com/photo-1586473219010-2ffc57b0d282?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80"
              width={382}
              height={216}
              alt="Estate Management"
            />
          </div>
          <div className="space-y-6 px-6 pb-6 pt-3">
            <DialogHeader>
              <DialogTitle>{stepContent[step - 1].title}</DialogTitle>
              <DialogDescription>{stepContent[step - 1].description}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex justify-center space-x-1.5 max-sm:order-1">
                {[...Array(totalSteps)].map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full bg-primary",
                      index + 1 === step ? "bg-primary" : "opacity-20",
                    )}
                  />
                ))}
              </div>
              <DialogFooter>
                {step === totalSteps ? (
                  <>
                    <DialogClose asChild>
                      <Button type="button" variant="ghost" onClick={handleDontShowAgain}>
                        Don&apos;t Show Again
                      </Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button type="button">
                        Get Started
                      </Button>
                    </DialogClose>
                  </>
                ) : (
                  <>
                    <DialogClose asChild>
                      <Button type="button" variant="ghost">
                        Skip
                      </Button>
                    </DialogClose>
                    <Button className="group" type="button" onClick={handleContinue}>
                      Next
                      <ArrowRight
                        className="-me-1 ms-2 opacity-60 transition-transform group-hover:translate-x-0.5"
                        size={16}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 