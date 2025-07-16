// Define relationship mappings for Malaysian Faraid system
const relationshipMappings: { [key: string]: string } = {
    'son': 'parent',
    'daughter': 'parent',
    'father': 'child',
    'mother': 'child',
    // 'parent': 'child',
    // 'child': 'parent',
    'husband': 'wife',
    'wife': 'husband',
    'brother': 'sibling',
    'sister': 'sibling',
    'sibling': 'sibling',
    'maternal_brother': 'maternal sibling',
    'maternal_sister': 'maternal sibling',
    'maternal_sibling': 'maternal sibling',
    'paternal brother': 'paternal sibling',
    'paternal sister': 'paternal sibling',
    'paternal sibling': 'paternal_sibling',
    'grandfather': 'grandchild',
    'grandmother': 'grandchild',
    'grandparent': 'grandchild',
    'grandson': 'grandparent',
    'granddaughter': 'grandparent',
    'grandchild': 'grandparent',
    'uncle': 'niece/nephew',
    'aunt': 'niece/nephew',
    'niece': 'uncle/aunt',
    'nephew': 'uncle/aunt',
    'cousin': 'cousin',
    'friend': 'friend',
    'spouse': 'spouse',
  };
  
  // Get all available relationships for the select input
  export function getAvailableRelationships(): string[] {
    return Object.keys(relationshipMappings).sort();
  }
  
  export function getInverseRelationship(relationship: string): string {
    const lowerRelationship = relationship.toLowerCase().trim();
    return relationshipMappings[lowerRelationship] || relationship;
  }
  
  // Check if a relationship is valid for Malaysian Faraid calculations
  export function isValidFaraidRelationship(relationship: string): boolean {
    const validRelationships = [
      'son', 
      'daughter', 
      'father', 
      'mother', 
      'husband', 
      'wife', 
      'brother', 
      'sister', 
      'maternal_brother', 
      'maternal_sister',
      'paternal_brother',
      'paternal_sister',
      'grandfather',
      'grandmother',
      'grandson',
      'granddaughter'
    ];
    
    return validRelationships.includes(relationship.toLowerCase().trim());
  }
  
  // Get a mapping of relationship to Faraid category
  export function getFaraidCategory(relationship: string): string {
    const lowerRelationship = relationship.toLowerCase().trim();
    
    // Direct mapping for most relationships
    if (isValidFaraidRelationship(lowerRelationship)) {
      return lowerRelationship;
    }
    
    // Special cases or aliases
    switch(lowerRelationship) {
      case 'spouse':
        return 'spouse'; // Will need to determine husband/wife based on gender
      case 'child':
        return 'child'; // Will need to determine son/daughter based on gender
      case 'parent':
        return 'parent'; // Will need to determine father/mother based on gender
      case 'sibling':
        return 'sibling'; // Will need to determine brother/sister based on gender
      case 'grandparent':
        return 'grandparent'; // Will need to determine grandfather/grandmother based on gender
      case 'grandchild':
        return 'grandchild'; // Will need to determine grandson/granddaughter based on gender
      default:
        return 'other'; // Not directly relevant for Faraid
    }
  }
  
  // Get user-friendly relationship names for display
  export function getDisplayRelationshipName(relationship: string): string {
    const displayNames: { [key: string]: string } = {
      'son': 'Son',
      'daughter': 'Daughter',
      'father': 'Father',
      'mother': 'Mother',
      'husband': 'Husband',
      'wife': 'Wife',
      'brother': 'Brother (Same Father & Mother)',
      'sister': 'Sister (Same Father & Mother)',
      'maternal brother': 'Maternal Brother (Same Mother)',
      'maternal sister': 'Maternal Sister (Same Mother)',
      'paternal brother': 'Paternal Brother (Same Father)',
      'paternal sister': 'Paternal Sister (Same Father)',
      'grandfather': 'Grandfather',
      'grandmother': 'Grandmother',
      'grandson': 'Grandson',
      'granddaughter': 'Granddaughter'
    };
    
    return displayNames[relationship.toLowerCase().trim()] || relationship;
  } 