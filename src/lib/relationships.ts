// Define relationship mappings
const relationshipMappings: { [key: string]: string } = {
    'son': 'parent',
    'daughter': 'parent',
    'father': 'child',
    'mother': 'child',
    'parent': 'child',
    'child': 'parent',
    'husband': 'wife',
    'wife': 'husband',
    'brother': 'sibling',
    'sister': 'sibling',
    'sibling': 'sibling',
    'maternal_brother': 'maternal_sibling',
    'maternal_sister': 'maternal_sibling',
    'maternal_sibling': 'maternal_sibling',
    'grandfather': 'grandchild',
    'grandmother': 'grandchild',
    'grandparent': 'grandchild',
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
  
  // Check if a relationship is valid for Faraid calculations
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
      'maternal_sister'
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
      default:
        return 'other'; // Not directly relevant for Faraid
    }
  } 