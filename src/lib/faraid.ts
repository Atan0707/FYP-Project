// Malaysian Faraid calculation utility based on Islamic inheritance rules
// References: Malaysian Faraid Distribution Rules (Kadar Bahagian Waris Fardu)

export type Heir = {
  id: string;
  fullName: string;
  relationship: string;
  ic?: string;
};

export type FaraidResult = {
  familyId: string;
  fullName: string;
  relationship: string;
  share: number;
  percentage: number;
  explanation: string;
};

interface CategorizedHeirs {
  sons: Heir[];
  daughters: Heir[];
  father: Heir | null;
  mother: Heir | null;
  grandfather: Heir | null;
  grandmother: Heir | null;
  husband: Heir | null;
  wife: Heir | null;
  siblingsSameFatherMother: { males: Heir[], females: Heir[] };
  siblingsSameFather: { males: Heir[], females: Heir[] };
  siblingsSameMother: { males: Heir[], females: Heir[] };
  grandchildren: { males: Heir[], females: Heir[] };
}

export function calculateFaraidFromFamilyMembers(
  familyMembers: Heir[],
  assetValue: number,
  userGender: 'male' | 'female' = 'male'
): FaraidResult[] {
  const results: FaraidResult[] = [];
  let totalShares = 0;
  
  // Categorize heirs according to Malaysian Faraid rules
  const categorized = mapFamilyMembersToMalaysianHeirs(familyMembers, userGender);
  
  // Helper function to add shares
  function addShare(heir: Heir, fraction: number, explanation: string) {
    results.push({
      familyId: heir.id,
      fullName: heir.fullName,
      relationship: heir.relationship,
      share: fraction * assetValue,
      percentage: fraction * 100,
      explanation
    });
    totalShares += fraction;
  }

  // Check conditions
  const hasDescendants = categorized.sons.length > 0 || categorized.daughters.length > 0 || 
                        categorized.grandchildren.males.length > 0 || categorized.grandchildren.females.length > 0;
  const hasMaleAscendants = categorized.father !== null || categorized.grandfather !== null;
  const hasMultipleSiblings = getTotalSiblingsCount(categorized) >= 2;

  // 1. ONE HALF (1/2)
  
  // 1.1 Husband (if no descendants)
  if (categorized.husband && !hasDescendants) {
    addShare(categorized.husband, 1/2, 'Husband: 1/2 because there are no descendants');
  }
  
  // 1.2 One daughter (if no sons)
  if (categorized.daughters.length === 1 && categorized.sons.length === 0) {
    addShare(categorized.daughters[0], 1/2, '1 Daughter: 1/2 because there are no sons');
  }
  
  // 1.3 One granddaughter (specific conditions)
  if (categorized.grandchildren.females.length === 1 && 
      categorized.grandchildren.males.length === 0 &&
      categorized.sons.length === 0 && categorized.daughters.length === 0) {
    addShare(categorized.grandchildren.females[0], 1/2, '1 Granddaughter: 1/2 because there are no children/grandsons');
  }
  
  // 1.4 One sister (same father and mother) with specific conditions
  if (categorized.siblingsSameFatherMother.females.length === 1 &&
      categorized.siblingsSameFatherMother.males.length === 0 &&
      !categorized.father && !categorized.grandfather && !hasDescendants) {
    addShare(categorized.siblingsSameFatherMother.females[0], 1/2, '1 Sister (same father & mother): 1/2 meeting required conditions');
  }
  
  // 1.5 One sister (same father only) with specific conditions
  if (categorized.siblingsSameFather.females.length === 1 &&
      categorized.siblingsSameFather.males.length === 0 &&
      categorized.siblingsSameFatherMother.males.length === 0 &&
      categorized.siblingsSameFatherMother.females.length === 0 &&
      !categorized.father && !categorized.grandfather && !hasDescendants) {
    addShare(categorized.siblingsSameFather.females[0], 1/2, '1 Sister (same father only): 1/2 meeting required conditions');
  }

  // 2. ONE THIRD (1/3)
  
  // 2.1 Mother (if no descendants and less than 2 siblings)
  if (categorized.mother && !hasDescendants && !hasMultipleSiblings) {
    addShare(categorized.mother, 1/3, 'Mother: 1/3 because there are no descendants and less than 2 siblings');
  }
  
  // 2.2 Two or more maternal siblings
  if (categorized.siblingsSameMother.males.length + categorized.siblingsSameMother.females.length >= 2 &&
      !hasDescendants && !hasMaleAscendants) {
    const totalMaternalSiblings = categorized.siblingsSameMother.males.length + categorized.siblingsSameMother.females.length;
    const sharePerSibling = (1/3) / totalMaternalSiblings;
    
    categorized.siblingsSameMother.males.forEach(sibling => {
      addShare(sibling, sharePerSibling, `Maternal sibling: shares 1/3 with ${totalMaternalSiblings - 1} other maternal siblings`);
    });
    
    categorized.siblingsSameMother.females.forEach(sibling => {
      addShare(sibling, sharePerSibling, `Maternal sibling: shares 1/3 with ${totalMaternalSiblings - 1} other maternal siblings`);
    });
  }

  // 3. ONE QUARTER (1/4)
  
  // 3.1 Husband (if has descendants)
  if (categorized.husband && hasDescendants) {
    addShare(categorized.husband, 1/4, 'Husband: 1/4 because there are descendants');
  }
  
  // 3.2 Wife (if no descendants)
  if (categorized.wife && !hasDescendants) {
    addShare(categorized.wife, 1/4, 'Wife: 1/4 because there are no descendants');
  }

  // 4. TWO THIRDS (2/3)
  
  // 4.1 Two or more daughters (if no sons)
  if (categorized.daughters.length >= 2 && categorized.sons.length === 0) {
    const sharePerDaughter = (2/3) / categorized.daughters.length;
    categorized.daughters.forEach(daughter => {
      addShare(daughter, sharePerDaughter, `Daughter: shares 2/3 with ${categorized.daughters.length - 1} other daughters`);
    });
  }
  
  // 4.2 Two or more granddaughters (specific conditions)
  if (categorized.grandchildren.females.length >= 2 &&
      categorized.grandchildren.males.length === 0 &&
      categorized.sons.length === 0 && categorized.daughters.length === 0) {
    const sharePerGranddaughter = (2/3) / categorized.grandchildren.females.length;
    categorized.grandchildren.females.forEach(granddaughter => {
      addShare(granddaughter, sharePerGranddaughter, `Granddaughter: shares 2/3 with ${categorized.grandchildren.females.length - 1} other granddaughters`);
    });
  }
  
  // 4.3 Two or more sisters (same father and mother) with conditions
  if (categorized.siblingsSameFatherMother.females.length >= 2 &&
      categorized.siblingsSameFatherMother.males.length === 0 &&
      !categorized.father && !categorized.grandfather && !hasDescendants) {
    const sharePerSister = (2/3) / categorized.siblingsSameFatherMother.females.length;
    categorized.siblingsSameFatherMother.females.forEach(sister => {
      addShare(sister, sharePerSister, `Sister (same father & mother): shares 2/3 with ${categorized.siblingsSameFatherMother.females.length - 1} other sisters`);
    });
  }
  
  // 4.4 Two or more sisters (same father only) with conditions
  if (categorized.siblingsSameFather.females.length >= 2 &&
      categorized.siblingsSameFather.males.length === 0 &&
      categorized.siblingsSameFatherMother.males.length === 0 &&
      categorized.siblingsSameFatherMother.females.length === 0 &&
      !categorized.father && !categorized.grandfather && !hasDescendants) {
    const sharePerSister = (2/3) / categorized.siblingsSameFather.females.length;
    categorized.siblingsSameFather.females.forEach(sister => {
      addShare(sister, sharePerSister, `Sister (same father only): shares 2/3 with ${categorized.siblingsSameFather.females.length - 1} other sisters`);
    });
  }

  // 5. ONE SIXTH (1/6)
  
  // 5.1 Father (if has descendants)
  if (categorized.father && hasDescendants) {
    addShare(categorized.father, 1/6, 'Father: 1/6 because there are descendants');
  }
  
  // 5.2 Mother (if has descendants or multiple siblings)
  if (categorized.mother && (hasDescendants || hasMultipleSiblings)) {
    addShare(categorized.mother, 1/6, 'Mother: 1/6 because there are descendants or multiple siblings');
  }
  
  // 5.3 Grandfather (specific conditions)
  if (categorized.grandfather && hasDescendants && !categorized.father &&
      categorized.siblingsSameFatherMother.males.length === 0 && categorized.siblingsSameFatherMother.females.length === 0 &&
      categorized.siblingsSameFather.males.length === 0 && categorized.siblingsSameFather.females.length === 0) {
    addShare(categorized.grandfather, 1/6, 'Grandfather: 1/6 because there are descendants and no father/siblings');
  }
  
  // 5.4 Grandmother (specific conditions)
  if (categorized.grandmother && !categorized.mother && 
      (!categorized.father || categorized.grandmother.relationship.includes('maternal'))) {
    addShare(categorized.grandmother, 1/6, 'Grandmother: 1/6 according to mother/father presence conditions');
  }
  
  // 5.5 Granddaughter (if one daughter exists and no sons/grandsons)
  if (categorized.daughters.length === 1 && categorized.sons.length === 0 &&
      categorized.grandchildren.males.length === 0 && categorized.grandchildren.females.length > 0) {
    categorized.grandchildren.females.forEach(granddaughter => {
      addShare(granddaughter, 1/6, 'Granddaughter: 1/6 because there is 1 daughter and no sons/grandsons');
    });
  }
  
  // 5.6 Sister (same father only) if one sister (same father and mother) exists
  if (categorized.siblingsSameFatherMother.females.length === 1 &&
      categorized.siblingsSameFather.females.length > 0 &&
      !hasDescendants && !categorized.father && !categorized.grandfather &&
      categorized.siblingsSameFatherMother.males.length === 0 && categorized.siblingsSameFather.males.length === 0) {
    categorized.siblingsSameFather.females.forEach(sister => {
      addShare(sister, 1/6, 'Sister (same father only): 1/6 because there is 1 sister (same father & mother)');
    });
  }
  
  // 5.7 One maternal sibling (if no descendants and no male ascendants)
  if (categorized.siblingsSameMother.males.length + categorized.siblingsSameMother.females.length === 1 &&
      !hasDescendants && !hasMaleAscendants) {
    const maternalSibling = categorized.siblingsSameMother.males[0] || categorized.siblingsSameMother.females[0];
    addShare(maternalSibling, 1/6, '1 Maternal sibling: 1/6 because there are no descendants and no male ascendants');
  }

  // 6. ONE EIGHTH (1/8)
  
  // 6.1 Wife (if has descendants)
  if (categorized.wife && hasDescendants) {
    addShare(categorized.wife, 1/8, 'Wife: 1/8 because there are descendants');
  }

  // 7. Handle remaining shares and 'Asabah (residuary inheritance)
  if (totalShares < 1) {
    const remainder = 1 - totalShares;
    
    // Father gets remainder if no descendants and no fixed share assigned
    if (categorized.father && !hasDescendants && totalShares < 1) {
      addShare(categorized.father, remainder, 'Father: Receives remainder as Asabah');
    }
    // Sons and daughters share remainder using 2:1 ratio
    // Only apply Asabah when there are sons present (daughters get Asabah only with sons)
    else if (categorized.sons.length > 0) {
      const totalUnits = (categorized.sons.length * 2) + categorized.daughters.length;
      if (totalUnits > 0) {
        const unitValue = remainder / totalUnits;
        
        categorized.sons.forEach(son => {
          addShare(son, unitValue * 2, 'Son: 2 portions compared to daughter (Asabah)');
        });
        
        categorized.daughters.forEach(daughter => {
          addShare(daughter, unitValue, 'Daughter: 1 portion compared to son (Asabah)');
        });
      }
    }
    // Handle "Radd" - return remainder to existing heirs proportionally
    else if (results.length > 0 && remainder > 0) {
      // Calculate proportional distribution of remainder based on existing shares
      const currentTotalShares = results.reduce((sum, result) => sum + (result.percentage / 100), 0);
      
      if (currentTotalShares > 0) {
        // Update each result with their proportional share of the remainder
        results.forEach(result => {
          const currentShare = result.percentage / 100;
          const proportionalRemainder = (currentShare / currentTotalShares) * remainder;
          const newShare = currentShare + proportionalRemainder;
          
          // Update the result
          result.share = newShare * assetValue;
          result.percentage = newShare * 100;
          result.explanation += ` + remainder distributed proportionally (Radd)`;
        });
        
        // Update totalShares to reflect the distribution
        totalShares = 1;
      }
    }
  }

  return results;
}

function mapFamilyMembersToMalaysianHeirs(
  familyMembers: Heir[], 
  userGender: 'male' | 'female'
): CategorizedHeirs {
  const result: CategorizedHeirs = {
    sons: [],
    daughters: [],
    father: null,
    mother: null,
    grandfather: null,
    grandmother: null,
    husband: null,
    wife: null,
    siblingsSameFatherMother: { males: [], females: [] },
    siblingsSameFather: { males: [], females: [] },
    siblingsSameMother: { males: [], females: [] },
    grandchildren: { males: [], females: [] }
  };
  
  familyMembers.forEach(member => {
    const relationship = member.relationship.toLowerCase().replace(/[_\s]/g, '');
    
    switch (relationship) {
      case 'son':
        result.sons.push(member);
        break;
      case 'daughter':
        result.daughters.push(member);
        break;
      case 'father':
        result.father = member;
        break;
      case 'mother':
        result.mother = member;
        break;
      case 'grandfather':
        result.grandfather = member;
        break;
      case 'grandmother':
        result.grandmother = member;
        break;
      case 'husband':
        if (userGender === 'female') result.husband = member;
        break;
      case 'wife':
        if (userGender === 'male') result.wife = member;
        break;
      case 'brother':
        result.siblingsSameFatherMother.males.push(member);
        break;
      case 'sister':
        result.siblingsSameFatherMother.females.push(member);
        break;
      case 'maternalbrother':
      case 'maternalsister':
        if (relationship === 'maternalbrother') {
          result.siblingsSameMother.males.push(member);
        } else {
          result.siblingsSameMother.females.push(member);
        }
        break;
      case 'paternalbrother':
      case 'paternalsister':
        if (relationship === 'paternalbrother') {
          result.siblingsSameFather.males.push(member);
        } else {
          result.siblingsSameFather.females.push(member);
        }
        break;
      case 'grandson':
        result.grandchildren.males.push(member);
        break;
      case 'granddaughter':
        result.grandchildren.females.push(member);
        break;
    }
  });
  
  return result;
}

function getTotalSiblingsCount(categorized: CategorizedHeirs): number {
  return categorized.siblingsSameFatherMother.males.length +
         categorized.siblingsSameFatherMother.females.length +
         categorized.siblingsSameFather.males.length +
         categorized.siblingsSameFather.females.length +
         categorized.siblingsSameMother.males.length +
         categorized.siblingsSameMother.females.length;
} 