'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calculator, Info, AlertCircle } from 'lucide-react';
import { calculateFaraidFromFamilyMembers, FaraidResult, Heir } from '@/lib/faraid';
import { Textarea } from '@/components/ui/textarea';
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
import { isValidFaraidRelationship } from '@/lib/relationships';

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
  onNotesChange?: (notes: string) => void;
  notes?: string;
}

// Islamic references for Faraid
const faraidReferences = [
  {
    title: "Sons and Daughters",
    reference: "Surah An-Nisa, verse 11",
    text: "Allah instructs you concerning your children: for the male, what is equal to the share of two females.",
    explanation: "Male heirs receive twice the share of female heirs of the same degree."
  },
  {
    title: "Parents",
    reference: "Surah An-Nisa, verse 11",
    text: "For one's parents, to each one of them is a sixth of his estate if he left children. But if he had no children and the parents [alone] inherit from him, then for his mother is one third.",
    explanation: "Parents receive 1/6 each if the deceased has children. If there are no children, the mother receives 1/3."
  },
  {
    title: "Spouses",
    reference: "Surah An-Nisa, verse 12",
    text: "And for you is half of what your wives leave if they have no child. But if they have a child, for you is one fourth of what they leave. And for the wives is one fourth if you leave no child. But if you leave a child, then for them is an eighth of what you leave.",
    explanation: "Husbands receive 1/2 if there are no children, or 1/4 if there are children. Wives receive 1/4 if there are no children, or 1/8 if there are children."
  },
  {
    title: "Siblings",
    reference: "Surah An-Nisa, verse 12",
    text: "And if a man or woman leaves neither ascendants nor descendants but has a brother or a sister, then for each one of them is a sixth. But if they are more than two, they share a third.",
    explanation: "Maternal siblings receive 1/6 each if there is only one, or share 1/3 if there are multiple."
  }
];

export default function FaraidDistribution({ 
  assetValue, 
  familyMembers, 
  userGender,
  onDistributionCalculated,
  onNotesChange,
  notes = ''
}: FaraidDistributionProps) {
  const [calculationResults, setCalculationResults] = useState<FaraidResult[]>([]);
  const [totalPercentage, setTotalPercentage] = useState<number>(0);
  const [validFamilyMembers, setValidFamilyMembers] = useState<Heir[]>([]);
  const [invalidFamilyMembers, setInvalidFamilyMembers] = useState<{id: string, fullName: string, relationship: string}[]>([]);

  // Filter family members for Faraid calculation
  useEffect(() => {
    const valid = familyMembers.filter(member => isValidFaraidRelationship(member.relationship));
    const invalid = familyMembers.filter(member => !isValidFaraidRelationship(member.relationship));
    
    setValidFamilyMembers(valid);
    setInvalidFamilyMembers(invalid);
    
    // Auto-calculate if we have valid family members
    if (valid.length > 0) {
      calculateDistribution();
    }
  }, [familyMembers, assetValue, userGender]);

  // Calculate total percentage whenever results change
  useEffect(() => {
    const total = calculationResults.reduce((sum, result) => sum + result.percentage, 0);
    setTotalPercentage(total);
  }, [calculationResults]);

  const calculateDistribution = () => {
    if (validFamilyMembers.length === 0) {
      setCalculationResults([]);
      return;
    }

    const results = calculateFaraidFromFamilyMembers(validFamilyMembers, assetValue, userGender);
    setCalculationResults(results);
    
    if (onDistributionCalculated) {
      onDistributionCalculated(results);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onNotesChange) {
      onNotesChange(e.target.value);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Faraid Distribution
        </CardTitle>
        <CardDescription>
          Automatic calculation based on your registered family members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="single" collapsible className="w-full mb-4">
          <AccordionItem value="references">
            <AccordionTrigger className="text-sm">
              Islamic References (Surah An-Nisa, verses 11-12)
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 text-sm">
                {faraidReferences.map((ref, index) => (
                  <div key={index} className="space-y-1">
                    <div className="font-medium">{ref.title}</div>
                    <div className="text-muted-foreground italic">{ref.reference}</div>
                    <div className="text-xs bg-muted/50 p-2 rounded-md">{ref.text}</div>
                    <div className="text-xs">{ref.explanation}</div>
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
              (son, daughter, father, mother, husband, wife, brother, sister, maternal brother, maternal sister).
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
                      {member.relationship}
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
                        {member.relationship}
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  These family members are not eligible for Faraid distribution based on their relationship.
                </p>
              </div>
            )}

            <div className="pt-2">
              <Button 
                onClick={calculateDistribution} 
                disabled={validFamilyMembers.length === 0}
                className="w-full"
              >
                <Calculator className="mr-2 h-4 w-4" />
                Recalculate Distribution
              </Button>
            </div>

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
                            This calculation follows the rules of Faraid as specified in the Quran. 
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
                      Note: The remaining {(100 - totalPercentage).toFixed(2)}% is distributed according to additional Faraid rules.
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
            
            <div className="pt-4">
              <label className="text-sm font-medium">Additional Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={handleNotesChange}
                placeholder="Add any additional notes about the faraid distribution"
                className="mt-1"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 