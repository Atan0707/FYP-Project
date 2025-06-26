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
  // New styles for asset details page
  pageTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 15,
    marginTop: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    width: 150,
  },
  detailValue: {
    fontSize: 11,
    flex: 1,
  },
  // Agreement details styles
  agreementCard: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#000',
    padding: 15,
    marginBottom: 20,
  },
  agreementHeader: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusBadge: {
    fontSize: 10,
    padding: 5,
    borderRadius: 3,
    textAlign: 'center',
    marginBottom: 10,
  },
  statusSigned: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  notesSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9fafb',
  },
  notesTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  // Signing section styles
  signingSection: {
    marginTop: 40,
    marginBottom: 30,
  },
  signingTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  signerBlock: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#ccc',
    paddingBottom: 15,
  },
  signerLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 15,
  },
  signatureInfo: {
    marginBottom: 3,
  },
  signatureLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  signatureValue: {
    fontSize: 10,
    marginLeft: 20,
    marginBottom: 3,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  signatureLabelInline: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    width: 120,
  },
  signatureValueInline: {
    fontSize: 10,
    flex: 1,
  },
  signatureSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    marginLeft: 90, // Indent to align with the signature text
  },
  signatureSubLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    width: 120,
  },
  signerName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 5,
  },
  sectionTitleSignature: {
    fontSize: 10  ,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 15,
    marginTop: 10,
  },
  detailLabelSignature: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    width: 150,
    marginBottom: 10,
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'signed':
      case 'completed':
        return { ...styles.statusBadge, ...styles.statusSigned };
      case 'pending':
      case 'pending_admin':
        return { ...styles.statusBadge, ...styles.statusPending };
      case 'rejected':
        return { ...styles.statusBadge, ...styles.statusRejected };
      default:
        return styles.statusBadge;
    }
  };

  return (
    <>
      {/* Cover Page */}
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

      Asset Details Page
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>ASSET DETAILS</Text>
        
        <Text style={styles.sectionTitle}>Asset Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Asset Name:</Text>
          <Text style={styles.detailValue}>{assetName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Distribution Type:</Text>
          <Text style={styles.detailValue}>{distributionType}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Agreement Created:</Text>
          <Text style={styles.detailValue}>{format(new Date(createdAt), 'dd MMMM yyyy, HH:mm')}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Agreements:</Text>
          <Text style={styles.detailValue}>{agreements.length}</Text>
        </View>

        <Text style={styles.sectionTitle}>Benefactor Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Full Name:</Text>
          <Text style={styles.detailValue}>{benefactorName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>IC Number:</Text>
          <Text style={styles.detailValue}>{benefactorIC}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Pending Agreements:</Text>
          <Text style={styles.detailValue}>
            {agreements.filter(a => a.status === 'pending' || a.status === 'pending_admin').length}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Rejected Agreements:</Text>
          <Text style={styles.detailValue}>
            {agreements.filter(a => a.status === 'rejected').length}
          </Text>
        </View>
      </Page>

            {/* Agreement Details Pages
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>AGREEMENT DETAILS</Text>
        
        {agreements.map((agreement, index) => (
          <View key={agreement.id} style={styles.agreementCard}>
            <Text style={styles.agreementHeader}>
              Agreement #{index + 1} - {agreement.familyMember?.fullName || 'Unknown'}
            </Text>
            
            <View style={getStatusStyle(agreement.status)}>
              <Text>Status: {agreement.status.toUpperCase()}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Family Member:</Text>
              <Text style={styles.detailValue}>{agreement.familyMember?.fullName || 'N/A'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>IC Number:</Text>
              <Text style={styles.detailValue}>{agreement.familyMember?.ic || 'N/A'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Relationship:</Text>
              <Text style={styles.detailValue}>{agreement.familyMember?.relationship || 'N/A'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Agreement ID:</Text>
              <Text style={styles.detailValue}>{agreement.id}</Text>
            </View>
            
            {agreement.signedAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Signed At:</Text>
                <Text style={styles.detailValue}>
                  {format(new Date(agreement.signedAt), 'dd MMMM yyyy, HH:mm')}
                </Text>
              </View>
            )}
            
            {agreement.notes && (
              <View style={styles.notesSection}>
                <Text style={styles.notesTitle}>Notes:</Text>
                <Text style={styles.notesText}>{agreement.notes}</Text>
              </View>
            )}
          </View>
        ))}
      </Page> */}

      {/* Signatures Page - Show all family members */}
      <Page size="A4" style={styles.page}>
        {/* <Text style={styles.pageTitle}>SIGNATURES</Text> */}
        
        {/* Formal Agreement Text */}
        <Text style={styles.sectionTitleSignature}>
          PADA MENYAKSIKAN HAL DI ATAS, pihak-pihak kepada Perjanjian ini telah menurunkan di sini tandatangan-tandatangan dan meteri-meteri mereka pada haribulan dan tahun yang mula tertulis di atas.
        </Text>
        
        <View style={styles.signingSection}>
          {/* Family Member Signatures */}
          {agreements
            .filter(agreement => agreement.familyMember) // Only show if family member exists
            .map((agreement) => (
              <View key={agreement.id} style={styles.signerBlock}>
                <Text style={styles.detailLabelSignature}>
                  AHLI KELUARGA:
                </Text>
                
                <View style={styles.signatureInfo}>
                  {(agreement.status === 'signed' || agreement.status === 'completed') && agreement.signedAt ? (
                    <>
                      <View style={styles.signatureRow}>
                        <Text style={styles.signatureLabelInline}>Tandatangan oleh:</Text>
                        <Text style={styles.signatureValueInline}>
                          {agreement.familyMember?.fullName.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.signatureRow}>
                        <Text style={styles.signatureLabelInline}>Pada:</Text>
                        <Text style={styles.signatureValueInline}>
                          {format(new Date(agreement.signedAt), 'dd-MM-yyyy HH:mm:ss')}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.signatureRow}>
                        <Text style={styles.signatureLabelInline}>Tandatangan oleh:</Text>
                        <Text style={styles.signatureValueInline}>
                          ___________________________
                        </Text>
                      </View>
                      <View style={styles.signatureRow}>
                        <Text style={styles.signatureLabelInline}>Pada:</Text>
                        <Text style={styles.signatureValueInline}>
                          ___________________________
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabelInline}>Nama:</Text>
                  <Text style={styles.signerName}>
                    {agreement.familyMember?.fullName.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))
          }

          {/* Admin/Government Signature */}
          <View style={styles.signerBlock}>
            <Text style={styles.detailLabelSignature}>
              KERAJAAN:
            </Text>
            
            <View style={styles.signatureInfo}>
              {agreements.some(a => a.status === 'completed') ? (
                <>
                  <View style={styles.signatureRow}>
                    <Text style={styles.signatureLabelInline}>Tandatangan oleh:</Text>
                    <Text style={styles.signatureValueInline}>
                      ADMIN KERAJAAN
                    </Text>
                  </View>
                  <View style={styles.signatureRow}>
                    <Text style={styles.signatureLabelInline}>Pada:</Text>
                    <Text style={styles.signatureValueInline}>
                      {format(new Date(), 'dd-MM-yyyy HH:mm:ss')}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.signatureRow}>
                    <Text style={styles.signatureLabelInline}>Tandatangan oleh:</Text>
                    <Text style={styles.signatureValueInline}>
                      {/* ___________________________ */}
                    </Text>
                  </View>
                  <View style={styles.signatureRow}>
                    <Text style={styles.signatureLabelInline}>Pada:</Text>
                    <Text style={styles.signatureValueInline}>
                      {/* ___________________________ */}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.signatureRow}>
              <Text style={styles.signatureLabelInline}>Nama:</Text>
              <Text style={styles.signerName}>
                ADMIN KERAJAAN
              </Text>
            </View>
          </View>

          {/* Guarantor Signature */}
          <View style={styles.signerBlock}>
            <Text style={styles.detailLabelSignature}>
              PENJAMIN:
            </Text>
            
            <View style={styles.signatureInfo}>
              <View style={styles.signatureRow}>
                <Text style={styles.signatureLabelInline}>Tandatangan oleh:</Text>
                <Text style={styles.signatureValueInline}>
                  {/* ___________________________ */}
                </Text>
              </View>
              <View style={styles.signatureRow}>
                <Text style={styles.signatureLabelInline}>Pada:</Text>
                <Text style={styles.signatureValueInline}>
                  {/* ___________________________ */}
                </Text>
              </View>
            </View>

            <View style={styles.signatureRow}>
              <Text style={styles.signatureLabelInline}>Nama:</Text>
              <Text style={styles.signerName}>
                {/* ___________________________ */}
              </Text>
            </View>
          </View>
        </View>
      </Page>
     </>
   );
 } 