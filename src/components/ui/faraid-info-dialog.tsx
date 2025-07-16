import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BookOpen, Info, Scale } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export function FaraidInfoDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Info className="h-4 w-4" />
          About Faraid
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5" />
            Faraid Distribution Guide
          </DialogTitle>
          <DialogDescription>
            Learn about Islamic inheritance law and how it applies in Malaysia
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5" />
                What is Faraid?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                Faraid is the Islamic law of inheritance, which prescribes specific shares for heirs based on their relationship to the deceased. 
                These rules are primarily derived from the Quran, specifically Surah An-Nisa (The Women), verses 11 and 12, and the Hadith of Prophet Muhammad (PBUH).
              </p>
              
              <Alert>
                <AlertTitle>Quranic Foundation</AlertTitle>
                <AlertDescription className="text-sm">
                  &ldquo;Allah instructs you concerning your children: for the male, what is equal to the share of two females. 
                  But if there are [only] daughters, two or more, for them is two thirds of one&apos;s estate. 
                  And if there is only one, for her is half.&rdquo; (Surah An-Nisa, 4:11)
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Key Principles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Principles of Faraid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-0.5">1</Badge>
                    <div className="text-sm">
                      <p className="font-medium">Gender-based Distribution</p>
                      <p className="text-muted-foreground">Male heirs generally receive twice the share of female heirs of the same degree</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-0.5">2</Badge>
                    <div className="text-sm">
                      <p className="font-medium">Fixed Shares</p>
                      <p className="text-muted-foreground">Shares are precisely defined for different categories of heirs</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-0.5">3</Badge>
                    <div className="text-sm">
                      <p className="font-medium">Proximity Priority</p>
                      <p className="text-muted-foreground">Closer relatives may exclude more distant ones from inheritance</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-0.5">4</Badge>
                    <div className="text-sm">
                      <p className="font-medium">Mandatory Rules</p>
                      <p className="text-muted-foreground">The distribution is divinely ordained and cannot be altered by personal preference</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-0.5">5</Badge>
                    <div className="text-sm">
                      <p className="font-medium">Family Protection</p>
                      <p className="text-muted-foreground">Ensures financial security for all family members according to their needs</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-0.5">6</Badge>
                    <div className="text-sm">
                      <p className="font-medium">Divine Justice</p>
                      <p className="text-muted-foreground">Reflects Allah&apos;s wisdom in balancing rights and responsibilities</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Malaysian Context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Faraid in Malaysian Law</CardTitle>
              <CardDescription>Legal framework and implementation in Malaysia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Legal Authority</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Islamic Family Law (Federal Territories) Act 1984</li>
                    <li>• Administration of Islamic Law Enactments (State level)</li>
                    <li>• Syariah Court Civil Procedure Act</li>
                    <li>• Probate and Administration Act 1959</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Governing Bodies</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Syariah Courts (inheritance disputes)</li>
                    <li>• Amanah Raya Berhad (estate administration)</li>
                    <li>• State Islamic Religious Councils</li>
                    <li>• Department of Islamic Development Malaysia (JAKIM)</li>
                  </ul>
                </div>
              </div>
              
              <Separator />
              
              <Alert>
                <AlertTitle>Important Note for Malaysian Muslims</AlertTitle>
                <AlertDescription className="text-sm">
                  In Malaysia, Faraid law is applicable to all Muslim citizens and governs the distribution of their estates. 
                  The Syariah courts have jurisdiction over inheritance matters for Muslims, and the distribution must comply 
                  with Islamic principles as codified in Malaysian Islamic law.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Malaysian Faraid Law References */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Malaysian Faraid Law References</CardTitle>
              <CardDescription>Detailed inheritance shares according to Malaysian Islamic law</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-700">One Half (1/2)</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Husband - if no descendants</li>
                      <li>• 1 Daughter - if no sons</li>
                      <li>• 1 Granddaughter - if no children/grandsons</li>
                      <li>• 1 Sister (same father & mother) - specific conditions</li>
                      <li>• 1 Sister (same father only) - specific conditions</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-700">One Third (1/3)</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Mother - if no descendants and less than 2 siblings</li>
                      <li>• 2 or more maternal siblings - specific conditions</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-700">One Quarter (1/4)</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Husband - if has descendants</li>
                      <li>• Wife - if no descendants</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-700">Two Thirds (2/3)</h4>
                    <ul className="text-sm space-y-1">
                      <li>• 2 or more daughters - if no sons</li>
                      <li>• 2 or more granddaughters - specific conditions</li>
                      <li>• 2 or more sisters (same father & mother) - specific conditions</li>
                      <li>• 2 or more sisters (same father only) - specific conditions</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-700">One Sixth (1/6)</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Father - if has descendants</li>
                      <li>• Mother - if has descendants or multiple siblings</li>
                      <li>• Grandfather - specific conditions</li>
                      <li>• Grandmother - specific conditions</li>
                      <li>• Granddaughter - if 1 daughter exists</li>
                      <li>• 1 Maternal sibling - specific conditions</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-700">One Eighth (1/8)</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Wife - if has descendants</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Common Shares Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Reference Guide</CardTitle>
              <CardDescription>Most common inheritance scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-center">Spouses</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Husband: 1/2 or 1/4</li>
                    <li>• Wife: 1/4 or 1/8</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-center">Children</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Sons: 2x daughters&apos; share</li>
                    <li>• Daughters: 1/2 or 2/3</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-center">Parents</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Father: 1/6 or remainder</li>
                    <li>• Mother: 1/3 or 1/6</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process in Malaysia */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inheritance Process in Malaysia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Required Documents</h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• Death certificate of the deceased</li>
                      <li>• Identity cards of all heirs</li>
                      <li>• Marriage certificate(s)</li>
                      <li>• Birth certificates of children</li>
                      <li>• List of assets and liabilities</li>
                      <li>• Property ownership documents</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Application Process</h4>
                    <ol className="text-sm space-y-2 text-muted-foreground">
                      <li>1. Apply for inheritance certificate at Syariah Court</li>
                      <li>2. Submit required documents and forms</li>
                      <li>3. Court verification and family tree validation</li>
                      <li>4. Faraid calculation by court officials</li>
                      <li>5. Issuance of inheritance certificate</li>
                      <li>6. Asset distribution according to certificate</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Alert>
            <AlertTitle>Important Disclaimer</AlertTitle>
            <AlertDescription className="text-sm">
              This calculator provides estimates based on standard Faraid principles. For official inheritance matters, 
              please consult with qualified Islamic scholars, Syariah lawyers, or approach the relevant Syariah Court 
              in your state. Complex family situations may require detailed legal analysis that goes beyond automated calculations.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
} 