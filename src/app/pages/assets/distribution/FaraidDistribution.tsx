'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Info, AlertCircle } from 'lucide-react';
import { calculateFaraidFromFamilyMembers, FaraidResult, Heir } from '@/lib/faraid';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { isValidFaraidRelationship, getDisplayRelationshipName } from '@/lib/relationships';

interface FaraidDistributionProps {
  assetValue: number;
  familyMembers: {
    id: string;
    fullName: string;
    relationship: string;
    ic?: string;
  }[];
  userGender: 'male' | 'female';
  onDistributionCalculated?: (results: FaraidResult[]) => void;
}

// Malaysian Faraid references in English
const malaysianFaraidReferences = [
  {
    title: "One Half (1/2)",
    conditions: [
      "Husband - if no descendants",
      "1 Daughter - if no sons", 
      "1 Granddaughter - if no children/grandsons",
      "1 Sister (same father & mother) - specific conditions",
      "1 Sister (same father only) - specific conditions"
    ]
  },
  {
    title: "One Third (1/3)",
    conditions: [
      "Mother - if no descendants and less than 2 siblings",
      "2 or more maternal siblings - specific conditions"
    ]
  },
  {
    title: "One Quarter (1/4)",
    conditions: [
      "Husband - if has descendants",
      "Wife - if no descendants"
    ]
  },
  {
    title: "Two Thirds (2/3)",
    conditions: [
      "2 or more daughters - if no sons",
      "2 or more granddaughters - specific conditions",
      "2 or more sisters (same father & mother) - specific conditions",
      "2 or more sisters (same father only) - specific conditions"
    ]
  },
  {
    title: "One Sixth (1/6)",
    conditions: [
      "Father - if has descendants",
      "Mother - if has descendants or multiple siblings",
      "Grandfather - specific conditions",
      "Grandmother - specific conditions",
      "Granddaughter - if 1 daughter exists",
      "1 Maternal sibling - specific conditions"
    ]
  },
  {
    title: "One Eighth (1/8)",
    conditions: [
      "Wife - if has descendants"
    ]
  }
];

export default function FaraidDistribution({ 
  assetValue, 
  familyMembers, 
  userGender,
  onDistributionCalculated
}: FaraidDistributionProps) {
  const [calculationResults, setCalculationResults] = useState<FaraidResult[]>([]);
  const [totalPercentage, setTotalPercentage] = useState<number>(0);
  const [validFamilyMembers, setValidFamilyMembers] = useState<Heir[]>([]);
  const [invalidFamilyMembers, setInvalidFamilyMembers] = useState<{id: string, fullName: string, relationship: string}[]>([]);

  // Filter family members for Faraid calculation and auto-calculate
  useEffect(() => {
    const valid = familyMembers.filter(member => isValidFaraidRelationship(member.relationship));
    const invalid = familyMembers.filter(member => !isValidFaraidRelationship(member.relationship));
    
    setValidFamilyMembers(valid);
    setInvalidFamilyMembers(invalid);
    
    // Auto-calculate when we have valid family members
    if (valid.length > 0) {
      const results = calculateFaraidFromFamilyMembers(valid, assetValue, userGender);
      setCalculationResults(results);
      
      if (onDistributionCalculated) {
        onDistributionCalculated(results);
      }
    } else {
      setCalculationResults([]);
    }
  }, [familyMembers, assetValue, userGender]);

  // Calculate total percentage whenever results change
  useEffect(() => {
    const total = calculationResults.reduce((sum, result) => sum + result.percentage, 0);
    setTotalPercentage(total);
  }, [calculationResults]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(value);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Malaysian Faraid Distribution
        </CardTitle>
        <CardDescription>
          Automatic calculation based on registered family members following Malaysian Faraid law
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="single" collapsible className="w-full mb-4">
          <AccordionItem value="references">
            <AccordionTrigger className="text-sm">
              Malaysian Faraid Law References
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 text-sm">
                {malaysianFaraidReferences.map((ref, index) => (
                  <div key={index} className="space-y-2">
                    <div className="font-medium text-blue-700">{ref.title}</div>
                    <div className="space-y-1">
                      {ref.conditions.map((condition, condIndex) => (
                        <div key={condIndex} className="text-xs bg-muted/50 p-2 rounded-md">
                          • {condition}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {validFamilyMembers.length === 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No eligible family members found</AlertTitle>
            <AlertDescription>
              You need to add family members with relationships that are valid for Faraid calculations 
              (son, daughter, father, mother, husband, wife, brother, sister, maternal siblings, grandchildren, grandparents).
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Eligible Family Members for Faraid</h3>
              <div className="space-y-1">
                {validFamilyMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between bg-muted/50 rounded-md p-2">
                    <div className="font-medium">{member.fullName}</div>
                    <Badge variant="outline" className="capitalize">
                      {getDisplayRelationshipName(member.relationship)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {invalidFamilyMembers.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Non-Eligible Family Members</h3>
                <div className="space-y-1">
                  {invalidFamilyMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between bg-muted/20 rounded-md p-2 text-muted-foreground">
                      <div>{member.fullName}</div>
                      <Badge variant="outline" className="capitalize opacity-70">
                        {getDisplayRelationshipName(member.relationship)}
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  These family members are not eligible for Faraid distribution based on their relationship.
                </p>
              </div>
            )}

            {calculationResults.length > 0 && (
              <div className="space-y-4 pt-4">
                <Separator />
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    Calculation Results
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            This calculation follows Malaysian Faraid methodology based on Islamic law. 
                            The distribution may be subject to additional Islamic jurisprudence rules.
                            Please consult with an Islamic scholar for final validation.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </h3>
                  <div className="space-y-3">
                    {calculationResults.map((result, index) => (
                      <div key={index} className="bg-muted/30 p-3 rounded-md">
                        <div className="flex justify-between items-center mb-1">
                          <div className="font-medium">{result.fullName}</div>
                          <Badge>{result.percentage.toFixed(2)}%</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">{result.explanation}</div>
                        <div className="font-semibold">{formatCurrency(result.share)}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center font-medium">
                    <span>Total Distribution:</span>
                    <span>{totalPercentage.toFixed(2)}%</span>
                  </div>
                  
                  {totalPercentage < 100 && (
                    <div className="mt-1 text-sm text-amber-500">
                      Note: The remaining {(100 - totalPercentage).toFixed(2)}% is distributed according to additional Faraid rules (Asabah).
                    </div>
                  )}
                  {totalPercentage > 100 && (
                    <div className="mt-1 text-sm text-red-500">
                      Warning: Total distribution exceeds 100%. This requires &apos;Awl (proportional reduction).
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 