'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function FaraidExplanation() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          About Faraid Distribution
        </CardTitle>
        <CardDescription>
          Islamic inheritance distribution according to Quranic principles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">
          Faraid is the Islamic law of inheritance, which prescribes specific shares for heirs based on their relationship to the deceased. 
          These rules are primarily derived from the Quran, specifically Surah An-Nisa (The Women), verses 11 and 12.
        </p>
        
        <Alert>
          <AlertTitle>Quranic Reference</AlertTitle>
          <AlertDescription className="text-sm">
            &ldquo;Allah instructs you concerning your children: for the male, what is equal to the share of two females. 
            But if there are [only] daughters, two or more, for them is two thirds of one&apos;s estate. 
            And if there is only one, for her is half.&rdquo; (Surah An-Nisa, 4:11)
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <h3 className="font-medium">Key Principles of Faraid:</h3>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Male heirs generally receive twice the share of female heirs of the same degree</li>
            <li>Shares are precisely defined for different categories of heirs</li>
            <li>Closer relatives may exclude more distant ones from inheritance</li>
            <li>The distribution ensures financial security for all family members</li>
            <li>The rules are mandatory and cannot be altered by personal preference</li>
          </ul>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>
            The calculator provided helps determine the shares according to Faraid principles, but for complex cases, 
            consultation with an Islamic scholar is recommended to ensure compliance with all aspects of Islamic law.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 