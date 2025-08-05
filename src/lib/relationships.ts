// Define relationship mappings for Malaysian Faraid system
// Only includes relationships that are valid for Islamic inheritance law
const relationshipMappings: { [key: string]: string } = {
    // Children relationships
    'son': 'parent',
    'daughter': 'parent',
    
    // Parent relationships
    'father': 'child',
    'mother': 'child',
    
    // Spouse relationships
    'husband': 'wife',
    'wife': 'husband',
    
    // Sibling relationships (same father and mother)
    'brother': 'sibling',
    'sister': 'sibling',
    
    // Maternal siblings (same mother only)
    'maternal_brother': 'maternal_sibling',
    'maternal_sister': 'maternal_sibling',
    
    // Paternal siblings (same father only)
    'paternal_brother': 'paternal_sibling',
    'paternal_sister': 'paternal_sibling',
    
    // Grandparent relationships
    'grandfather': 'grandchild',
    'grandmother': 'grandchild',
    
    // Grandchildren relationships
    'grandson': 'grandparent',
    'granddaughter': 'grandparent',
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
    
    // Direct mapping for all valid Faraid relationships
    if (isValidFaraidRelationship(lowerRelationship)) {
      return lowerRelationship;
    }
    
    // Invalid relationships are not relevant for Faraid calculations
    return 'other';
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
      'maternal_brother': 'Maternal Brother (Same Mother)',
      'maternal_sister': 'Maternal Sister (Same Mother)',
      'paternal_brother': 'Paternal Brother (Same Father)',
      'paternal_sister': 'Paternal Sister (Same Father)',
      'grandfather': 'Grandfather',
      'grandmother': 'Grandmother',
      'grandson': 'Grandson',
      'granddaughter': 'Granddaughter'
    };
    
    return displayNames[relationship.toLowerCase().trim()] || relationship;
  } 