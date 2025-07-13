// Faraid calculation utility based on Islamic inheritance rules
// References: Surah An-Nisa, verses 11 and 12

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

export function calculateFaraidFromFamilyMembers(
  familyMembers: Heir[],
  assetValue: number,
  userGender: 'male' | 'female' = 'male' // Default to male if not specified
): FaraidResult[] {
  // Initialize shares object to track allocated shares
  let totalShares = 0;
  const results: FaraidResult[] = [];
  
  // Map family members to Faraid categories
  const categorizedHeirs = mapFamilyMembersToHeirs(familyMembers, userGender);
  
  // Count heirs by relationship
  const children = [...categorizedHeirs.sons, ...categorizedHeirs.daughters];
  const sons = categorizedHeirs.sons;
  const daughters = categorizedHeirs.daughters;
  const father = categorizedHeirs.father;
  const mother = categorizedHeirs.mother;
  const spouse = categorizedHeirs.spouse;
  const siblings = [...categorizedHeirs.brothers, ...categorizedHeirs.sisters];
  const maternalSiblings = [...categorizedHeirs.maternalBrothers, ...categorizedHeirs.maternalSisters];
  
  // Check if deceased has children
  const hasChildren = children.length > 0;
  
  // Calculate shares for spouse
  if (spouse) {
    if (spouse.relationship === 'husband') {
      if (!hasChildren) {
        // Husband gets 1/2 if no children
        addShare(spouse, 1/2, 'Husband receives 1/2 if there are no children');
      } else {
        // Husband gets 1/4 if there are children
        addShare(spouse, 1/4, 'Husband receives 1/4 if there are children');
      }
    } else if (spouse.relationship === 'wife') {
      if (!hasChildren) {
        // Wife gets 1/4 if no children
        addShare(spouse, 1/4, 'Wife receives 1/4 if there are no children');
      } else {
        // Wife gets 1/8 if there are children
        addShare(spouse, 1/8, 'Wife receives 1/8 if there are children');
      }
    }
  }
  
  // Calculate shares for parents
  if (mother) {
    if (hasChildren || siblings.length >= 2) {
      // Mother gets 1/6 if there are children or multiple siblings
      addShare(mother, 1/6, 'Mother receives 1/6 if there are children or multiple siblings');
    } else {
      // Mother gets 1/3 if no children and fewer than 2 siblings
      addShare(mother, 1/3, 'Mother receives 1/3 if there are no children and fewer than 2 siblings');
    }
  }
  
  if (father) {
    if (hasChildren) {
      // Father gets 1/6 if there are children
      addShare(father, 1/6, 'Father receives 1/6 if there are children');
    } else {
      // Father gets remainder if no children
      addShare(father, 'remainder', 'Father receives remaining portion as there are no children');
    }
  }
  
  // Calculate shares for children
  if (sons.length > 0 && daughters.length > 0) {
    // If both sons and daughters, sons get twice the share of daughters
    const totalUnits = sons.length * 2 + daughters.length;
    const sonSharePerPerson = (2 / totalUnits);
    const daughterSharePerPerson = (1 / totalUnits);
    
    // Distribute shares to sons
    sons.forEach(son => {
      addShare(son, sonSharePerPerson, 'Son receives twice the share of a daughter');
    });
    
    // Distribute shares to daughters
    daughters.forEach(daughter => {
      addShare(daughter, daughterSharePerPerson, 'Daughter receives half the share of a son');
    });
  } else if (sons.length > 0) {
    // Only sons, they share the remainder
    const remainderShare = 1 - totalShares;
    const sharePerSon = remainderShare / sons.length;
    
    sons.forEach(son => {
      addShare(son, sharePerSon, 'Son shares the remaining portion equally with other sons');
    });
  } else if (daughters.length === 1) {
    // Only one daughter, she gets 1/2
    addShare(daughters[0], 1/2, 'A single daughter receives 1/2');
  } else if (daughters.length > 1) {
    // Multiple daughters, they share 2/3
    const sharePerDaughter = (2/3) / daughters.length;
    
    daughters.forEach(daughter => {
      addShare(daughter, sharePerDaughter, `Daughter shares 2/3 equally with ${daughters.length - 1} other daughter(s)`);
    });
  }
  
  // Calculate shares for maternal siblings if no children and no parents
  if (!hasChildren && (!father && !mother) && maternalSiblings.length > 0) {
    if (maternalSiblings.length === 1) {
      // One maternal sibling gets 1/6
      addShare(maternalSiblings[0], 1/6, 'A single maternal sibling receives 1/6');
    } else {
      // Multiple maternal siblings share 1/3
      const sharePerSibling = (1/3) / maternalSiblings.length;
      
      maternalSiblings.forEach(sibling => {
        addShare(sibling, sharePerSibling, `Maternal sibling shares 1/3 equally with ${maternalSiblings.length - 1} other maternal sibling(s)`);
      });
    }
  }
  
  // Helper function to add shares
  function addShare(heir: Heir, share: number | 'remainder', explanation: string) {
    if (share === 'remainder') {
      // Calculate remainder after all fixed shares
      const remainingShare = 1 - totalShares;
      if (remainingShare > 0) {
        results.push({
          familyId: heir.id,
          fullName: heir.fullName,
          relationship: heir.relationship,
          share: remainingShare * assetValue,
          percentage: remainingShare * 100,
          explanation
        });
        totalShares += remainingShare;
      }
    } else {
      results.push({
        familyId: heir.id,
        fullName: heir.fullName,
        relationship: heir.relationship,
        share: share * assetValue,
        percentage: share * 100,
        explanation
      });
      totalShares += share;
    }
  }
  
  return results;
}

// Helper function to categorize family members into Faraid heir categories
function mapFamilyMembersToHeirs(
  familyMembers: Heir[], 
  userGender: 'male' | 'female'
) {
  const result = {
    sons: [] as Heir[],
    daughters: [] as Heir[],
    father: null as Heir | null,
    mother: null as Heir | null,
    spouse: null as Heir | null,
    brothers: [] as Heir[],
    sisters: [] as Heir[],
    maternalBrothers: [] as Heir[],
    maternalSisters: [] as Heir[],
  };
  
  familyMembers.forEach(member => {
    const relationship = member.relationship.toLowerCase();
    
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
      case 'husband':
        if (userGender === 'female') {
          result.spouse = member;
        }
        break;
      case 'wife':
        if (userGender === 'male') {
          result.spouse = member;
        }
        break;
      case 'brother':
        result.brothers.push(member);
        break;
      case 'sister':
        result.sisters.push(member);
        break;
      case 'maternal brother':
      case 'maternal_brother':
        result.maternalBrothers.push(member);
        break;
      case 'maternal sister':
      case 'maternal_sister':
        result.maternalSisters.push(member);
        break;
      // Add more cases as needed
    }
  });
  
  return result;
} 