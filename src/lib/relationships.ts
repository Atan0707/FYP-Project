// Define relationship mappings
const relationshipMappings: { [key: string]: string } = {
  'son': 'parent',
  'daughter': 'parent',
  'father': 'parent',
  'mother': 'parent',
  'husband': 'wife',
  'wife': 'husband',
  'brother': 'sibling',
  'sister': 'sibling',
  'grandfather': 'grandparent',
  'grandmother': 'grandparent',
  'uncle': 'uncle/aunt',
  'aunt': 'uncle/aunt',
  'niece': 'niece/nephew',
  'nephew': 'niece/nephew',
};

// Get all available relationships for the select input
export function getAvailableRelationships(): string[] {
  return Object.keys(relationshipMappings).sort();
}

export function getInverseRelationship(relationship: string): string {
  const lowerRelationship = relationship.toLowerCase().trim();
  return relationshipMappings[lowerRelationship] || relationship;
} 