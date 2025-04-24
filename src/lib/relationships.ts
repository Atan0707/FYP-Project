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