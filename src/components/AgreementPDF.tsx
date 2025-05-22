import { Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
    lineHeight: 1.5,
  },
  signatureSection: {
    marginTop: 30,
  },
  signatureBox: {
    marginBottom: 20,
    padding: 10,
    borderRadius: 4,
    border: '1px solid #ccc',
  },
  signatureLine: {
    borderBottom: '1px solid black',
    width: '60%',
    marginBottom: 5,
  },
  signatureInfo: {
    fontSize: 10,
    color: '#666',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: 60,
    color: 'rgba(200, 200, 200, 0.3)',
    fontFamily: 'Helvetica-Bold',
  },
});

interface AgreementPDFProps {
  assetName: string;
  distributionType: string;
  agreements: Array<{
    id: string;
    status: string;
    signedAt?: string;
    notes?: string;
    familyMember?: {
      id: string;
      fullName: string;
      relationship: string;
      email?: string;
    };
  }>;
  createdAt: string;
}

export function AgreementPDF({ assetName, distributionType, agreements, createdAt }: AgreementPDFProps) {
  // Format the distribution type for display
  const formattedType = distributionType.charAt(0).toUpperCase() + distributionType.slice(1);

  // Sort agreements by status (signed first, then pending, then rejected)
  const sortedAgreements = [...agreements].sort((a, b) => {
    const statusOrder = { signed: 0, pending: 1, rejected: 2 };
    return (statusOrder[a.status as keyof typeof statusOrder] || 1) - (statusOrder[b.status as keyof typeof statusOrder] || 1);
  });

  return (
    <Page size="A4" style={styles.page}>
      {/* Watermark */}
      {/* <View style={styles.watermark}>
        <Text>DIGITAL COPY</Text>
      </View> */}

      <View style={styles.header}>
        <Text style={styles.title}>Asset Distribution Agreement</Text>
        <Text style={styles.subtitle}>Digital Signature Record</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Asset Details</Text>
        <Text style={styles.text}>Asset Name: {assetName}</Text>
        <Text style={styles.text}>Distribution Type: {formattedType}</Text>
        <Text style={styles.text}>Created On: {format(new Date(createdAt), 'PPP pp')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Signatures ({sortedAgreements.length})</Text>
        {sortedAgreements.map((agreement) => (
          <View key={agreement.id} style={styles.signatureBox}>
            <Text style={styles.text}>
              Name: {agreement.familyMember?.fullName || 'Unknown'}
            </Text>
            <Text style={styles.text}>
              Relationship: {agreement.familyMember?.relationship || 'Unknown'}
            </Text>
            <Text style={styles.text}>
              Status: {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
            </Text>
            {agreement.signedAt && (
              <Text style={styles.text}>
                Signed On: {format(new Date(agreement.signedAt), 'PPP pp')}
              </Text>
            )}
            {agreement.notes && (
              <Text style={styles.text}>Notes: {agreement.notes}</Text>
            )}
            <View style={styles.signatureLine} />
            <Text style={styles.signatureInfo}>Digital Signature</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.text}>
          This document was generated on {format(new Date(), 'PPP pp')}
        </Text>
        <Text style={styles.text}>
          This is an official digital record of signatures collected through the system.
          The authenticity of this document can be verified through the system.
        </Text>
      </View>
    </Page>
  );
} 