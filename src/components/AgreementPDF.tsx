import { Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  barcode: {
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  dutiText: {
    fontSize: 10,
    textAlign: 'right',
    marginBottom: 20,
  },
  antara: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  personInfo: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  personId: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 30,
  },
  personNote: {
    fontSize: 8,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 40,
  },
  dan: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 40,
  },
  organization: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 40,
  },
  dateSection: {
    fontSize: 12,
    textAlign: 'left',
    marginTop: 40,
  },
  footer: {
    fontSize: 10,
    marginTop: 20,
  },
});

interface AgreementDetails {
  id: string;
  status: string;
  signedAt?: string;
  notes?: string;
  familyMember?: {
    id: string;
    fullName: string;
    relationship: string;
    ic: string;
  };
}

interface AgreementPDFProps {
  assetName: string;
  distributionType: string;
  agreements: AgreementDetails[];
  createdAt: string;
  benefactorName: string;
  benefactorIC: string;
}

export function AgreementPDF({ 
  assetName, 
  distributionType, 
  agreements, 
  createdAt,
  benefactorName,
  benefactorIC
}: AgreementPDFProps) {
  // Find the beneficiary (the person who signed)
  const beneficiary = agreements.find(a => 
    a.status === 'signed' || 
    a.status === 'completed' || 
    a.status === 'pending_admin'
  )?.familyMember;

  return (
    <Page size="A4" style={styles.page}>
      {/* Barcode Section */}
      <View style={styles.barcode}>
        {/* Add barcode image here */}
      </View>

      {/* Government Logo */}
      {/* <View>
        <Image style={styles.logo} src="./assets/logo.png" />
      </View> */}

      {/* Duty Text */}
      {/* <Text style={styles.dutiText}>Duti Setem Telah Dibayar</Text> */}

      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>ASSETS DISTRIBUTIONS AGREEMENT</Text>
        <Text style={styles.title}>YEAR {format(new Date(createdAt), 'yyyy')}</Text>
        <Text style={styles.title}>{assetName.toUpperCase()}</Text>
        <Text style={styles.title}>Distribution Type: {distributionType.toUpperCase()}</Text>
      </View>

      {/* ANTARA Section */}
      <Text style={styles.antara}>BETWEEN</Text>

      {/* Person Info - Owner/Benefactor */}
      <Text style={styles.personInfo}>{benefactorName.toUpperCase()}</Text>
      <Text style={styles.personId}>({benefactorIC})</Text>
      <Text style={styles.personNote}>(Benefactor Name and IC Number)</Text>

      {/* DAN Section */}
      <Text style={styles.dan}>AND</Text>

      {/* Organization */}
      <Text style={styles.organization}>WILL & ESTATE MANAGEMENT SDN BHD</Text>

      {/* Second DAN */}
      <Text style={styles.dan}>AND</Text>

      {/* Second Person - Beneficiary */}
      <Text style={styles.personInfo}>{beneficiary?.fullName.toUpperCase() || 'BENEFICIARY NAME'}</Text>
      <Text style={styles.personId}>({beneficiary?.ic || 'IC NUMBER'})</Text>
      <Text style={styles.personNote}>(Beneficiary Name and IC Number)</Text>

      {/* Date Section */}
      <Text style={styles.dateSection}>
        Date: {format(new Date(createdAt), 'dd MMMM yyyy')}
      </Text>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text>For the use of the Department:</Text>
        <Text>File Code: {agreements[0]?.id || 'N/A'}</Text>
      </View>
    </Page>
  );
} 