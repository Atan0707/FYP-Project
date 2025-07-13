import { Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 11,
  },
  // First page - Cover page styles
  coverPage: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  dutiSetem: {
    position: 'absolute',
    top: 30,
    right: 30,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 15,
  },
  logo: {
    width: 80,
    height: 80,
  },
  coverTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 5,
    lineHeight: 1.3,
  },
  coverSubtitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  antara: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 30,
  },
  dan: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 30,
  },
  partyBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  partyContent: {
    alignItems: 'center',
  },
  partyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  partyIC: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 5,
  },
  partyDescription: {
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  governmentName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  dateSection: {
    position: 'absolute',
    bottom: 100,
    left: 30,
    right: 30,
  },
  dateText: {
    fontSize: 11,
    marginBottom: 5,
  },
  departmentInfo: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
  },
  departmentText: {
    fontSize: 10,
    marginBottom: 3,
  },
  // Header styles
  governmentHeader: {
    textAlign: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: '#000',
    paddingBottom: 15,
  },
  governmentTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  departmentTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },
  subDepartment: {
    fontSize: 12,
    marginBottom: 10,
  },
  // Document identification
  documentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopStyle: 'solid',
    borderBottomStyle: 'solid',
    borderTopColor: '#ccc',
    borderBottomColor: '#ccc',
  },
  docNumber: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  docDate: {
    fontSize: 10,
  },
  // Agreement title
  agreementTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 30,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Party information
  partySection: {
    marginBottom: 25,
  },
  partyHeader: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  partyInfo: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: '#0066cc',
  },
  partyDetail: {
    fontSize: 10,
    marginBottom: 2,
  },
  partyRole: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#666',
  },
  // Asset information
  assetSection: {
    marginBottom: 25,
    padding: 15,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 15,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#ccc',
    paddingBottom: 5,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    width: 120,
    color: '#333',
  },
  detailValue: {
    fontSize: 10,
    flex: 1,
  },
  // Distribution information
  distributionSection: {
    marginBottom: 25,
    padding: 15,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#ddd',
  },
  distributionType: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 15,
    padding: 8,
    backgroundColor: '#e3f2fd',
    textTransform: 'uppercase',
  },
  // Beneficiary table
  beneficiarySection: {
    marginBottom: 25,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#ccc',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#ddd',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftStyle: 'solid',
    borderRightStyle: 'solid',
    borderLeftColor: '#ccc',
    borderRightColor: '#ccc',
  },
  tableCell: {
    fontSize: 9,
    textAlign: 'center',
  },
  // Status badges
  statusBadge: {
    fontSize: 9,
    padding: 4,
    borderRadius: 3,
    textAlign: 'center',
    marginBottom: 5,
  },
  statusSigned: {
    backgroundColor: '#d4edda',
    color: '#155724',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#c3e6cb',
  },
  statusPending: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#ffeaa7',
  },
  statusCompleted: {
    backgroundColor: '#d1ecf1',
    color: '#0c5460',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#bee5eb',
  },
  // Terms and conditions
  termsSection: {
    marginBottom: 25,
    padding: 15,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#ddd',
  },
  termItem: {
    fontSize: 10,
    marginBottom: 8,
    lineHeight: 1.4,
  },
  termNumber: {
    fontFamily: 'Helvetica-Bold',
  },
  // Signature section
  signatureSection: {
    marginTop: 30,
  },
  signatureTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 25,
    textTransform: 'uppercase',
  },
  signatureBlock: {
    marginBottom: 25,
    padding: 15,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#ddd',
  },
  signatureRole: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    textTransform: 'uppercase',
    color: '#0066cc',
  },
  signatureInfo: {
    marginBottom: 8,
  },
  signatureRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    width: 100,
  },
  signatureValue: {
    fontSize: 10,
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#000',
    width: 200,
    height: 30,
  },
  // Footer
  footer: {
    marginTop: 30,
    padding: 15,
    borderTopWidth: 2,
    borderTopStyle: 'solid',
    borderTopColor: '#000',
    backgroundColor: '#f8f9fa',
  },
  footerText: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 3,
  },
  // Watermark/Official stamp area
  officialSection: {
    marginTop: 20,
    padding: 20,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#0066cc',
    backgroundColor: '#f0f8ff',
  },
  officialText: {
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
});

interface AgreementDetails {
  id: string;
  status: string;
  signedAt?: string;
  notes?: string;
  transactionHash?: string;
  familyMember?: {
    id: string;
    fullName: string;
    relationship: string;
    ic: string;
    phone?: string;
  };
}

interface AgreementPDFProps {
  assetName: string;
  distributionType: string;
  agreements: AgreementDetails[];
  createdAt: string;
  benefactorName: string;
  benefactorIC: string;
  assetValue?: number;
  assetDescription?: string;
  agreementId?: string;
  adminSignedAt?: string;
  adminNotes?: string;
  adminName?: string;
}

export function AgreementPDF({ 
  assetName, 
  distributionType, 
  agreements, 
  createdAt,
  benefactorName,
  benefactorIC,
  assetValue,
  assetDescription,
  agreementId,
  adminSignedAt,
  adminNotes,
  adminName
}: AgreementPDFProps) {
  const agreementNumber = agreementId?.slice(-8).toUpperCase() || 'WEMSP' + new Date().getFullYear();
  const beneficiaries = agreements.filter(a => a.familyMember);
  const isCompleted = agreements.some(a => a.status === 'completed');
  
  // Extract admin name from notes if not provided directly
  let displayAdminName = adminName || 'Admin';
  if (!adminName && adminNotes) {
    // Try to extract from "[username] notes" format
    const usernameMatch = adminNotes.match(/^\[([^\]]+)\]/);
    if (usernameMatch && usernameMatch[1]) {
      displayAdminName = usernameMatch[1];
    } else {
      // Try to extract from "Signed by username" format
      const signedByMatch = adminNotes.match(/^Signed by (.+)$/);
      if (signedByMatch && signedByMatch[1]) {
        displayAdminName = signedByMatch[1];
      }
    }
  }

  const getDistributionTypeDisplay = (type: string) => {
    switch (type.toLowerCase()) {
      case 'waqf': return 'WAKAF (ENDOWMENT)';
      case 'faraid': return 'FARAID (ISLAMIC INHERITANCE)';
      case 'hibah': return 'HIBAH (GIFT)';
      case 'will': return 'WASIAT (WILL)';
      default: return type.toUpperCase();
    }
  };

  return (
    <>
      {/* Cover Page - Malaysian Government Style */}
      <Page size="A4" style={styles.coverPage}>
        {/* Duti Setem */}
        {/* <Text style={styles.dutiSetem}>Duti Setem Telah Dibayar</Text> */}
        
        {/* Government Logo */}
        <View style={styles.logoContainer}>
          <Image style={styles.logo} src="/assets/logo.png" />
        </View>
        
        {/* Document Title */}
        <Text style={styles.coverTitle}>
          PERJANJIAN PENGAGIHAN HARTA
        </Text>
        <Text style={styles.coverSubtitle}>
          TAHUN {format(new Date(createdAt), 'yyyy')}
        </Text>
        
        {/* ANTARA Section */}
        <Text style={styles.antara}>ANTARA</Text>
        
        {/* First Party - Benefactor */}
        <View style={styles.partyBox}>
          <View style={styles.partyContent}>
            <Text style={styles.partyName}>
              {benefactorName.toUpperCase()}
            </Text>
            <Text style={styles.partyIC}>
              ({benefactorIC})
            </Text>
            <Text style={styles.partyDescription}>
              (Nama PEMBERI dan No. Kad Pengenalan)
            </Text>
          </View>
        </View>
        
        {/* DAN Section */}
        <Text style={styles.dan}>DAN</Text>
        
        {/* Second Party - Government */}
        <View style={styles.partyBox}>
          <View style={styles.partyContent}>
            <Text style={styles.governmentName}>
              WILL & ESTATE MANAGEMENT SOLUTION PROVIDER (WEMSP)
            </Text>
          </View>
        </View>
        
        {/* DAN Section */}
        <Text style={styles.dan}>DAN</Text>
        
        {/* Third Party - Beneficiary */}
        {beneficiaries.length > 0 && (
          <View style={styles.partyBox}>
            <View style={styles.partyContent}>
              <Text style={styles.partyName}>
                {beneficiaries[0].familyMember?.fullName.toUpperCase()}
              </Text>
              <Text style={styles.partyIC}>
                ({beneficiaries[0].familyMember?.ic})
              </Text>
              <Text style={styles.partyDescription}>
                (Nama PENERIMA dan No. Kad Pengenalan)
              </Text>
            </View>
          </View>
        )}
        
        {/* Date Section */}
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>
            Bertarikh pada    {format(new Date(createdAt), 'dd')} hari bulan {format(new Date(createdAt), 'MMMM yyyy')}
          </Text>
        </View>
        
        {/* Department Information */}
        <View style={styles.departmentInfo}>
          <Text style={styles.departmentText}>
            Untuk Kegunaan Jabatan:
          </Text>
          <Text style={styles.departmentText}>
            Kod Fail: {agreementNumber}
          </Text>
          {/* <Text style={styles.departmentText}>
            Program: PROGRAM PENGAGIHAN HARTA DIGITAL
          </Text> */}
          <Text style={styles.departmentText}>
            Will & Estate Management Solution Provider (WEMSP)
          </Text>
        </View>
      </Page>

      {/* Second Page - Detailed Information */}
      <Page size="A4" style={styles.page}>
        {/* Government Header */}
        <View style={styles.governmentHeader}>
          <Text style={styles.governmentTitle}>WILL & ESTATE MANAGEMENT SOLUTION PROVIDER (WEMSP)</Text>
          {/* <Text style={styles.governmentTitle}>GOVERNMENT OF MALAYSIA</Text> */}
          {/* <Text style={styles.departmentTitle}>JABATAN HARTA PUSAKA</Text> */}
          <Text style={styles.subDepartment}>Department of Estate Management</Text>
        </View>

        {/* Document Information */}
        <View style={styles.documentInfo}>
          <Text style={styles.docNumber}>
            Rujukan: WEM/{agreementNumber}/{format(new Date(createdAt), 'yyyy')}
          </Text>
          <Text style={styles.docDate}>
            Tarikh: {format(new Date(createdAt), 'dd MMMM yyyy')}
          </Text>
        </View>

        {/* Agreement Title */}
        <Text style={styles.agreementTitle}>
          PERJANJIAN PENGAGIHAN HARTA
        </Text>
        <Text style={styles.agreementTitle}>
          ASSET DISTRIBUTION AGREEMENT
        </Text>

        {/* Distribution Type */}
        <View style={styles.distributionSection}>
          <Text style={styles.distributionType}>
            {getDistributionTypeDisplay(distributionType)}
          </Text>
        </View>

        {/* Parties Section */}
        <View style={styles.partySection}>
          <Text style={styles.partyHeader}>PIHAK-PIHAK YANG TERLIBAT / PARTIES INVOLVED</Text>
          
          {/* Benefactor */}
          <View style={styles.partyInfo}>
            <Text style={styles.partyName}>{benefactorName.toUpperCase()}</Text>
            <Text style={styles.partyDetail}>No. K/P: {benefactorIC}</Text>
            <Text style={styles.partyRole}>(PEMBERI HARTA / GRANTOR)</Text>
          </View>

          {/* Government */}
          <View style={styles.partyInfo}>
            <Text style={styles.partyName}>JABATAN HARTA PUSAKA MALAYSIA</Text>
            <Text style={styles.partyDetail}>Department of Estate Management Malaysia</Text>
            <Text style={styles.partyRole}>(PIHAK KERAJAAN / GOVERNMENT AUTHORITY)</Text>
          </View>

          {/* Beneficiaries */}
          {beneficiaries.map((agreement, index) => (
            <View key={agreement.id} style={styles.partyInfo}>
              <Text style={styles.partyName}>{agreement.familyMember?.fullName.toUpperCase()}</Text>
              <Text style={styles.partyDetail}>No. K/P: {agreement.familyMember?.ic}</Text>
              <Text style={styles.partyDetail}>Hubungan: {agreement.familyMember?.relationship}</Text>
              <Text style={styles.partyRole}>(PENERIMA HARTA / BENEFICIARY {index + 1})</Text>
            </View>
          ))}
        </View>

        {/* Asset Information */}
        <View style={styles.assetSection}>
          <Text style={styles.sectionTitle}>MAKLUMAT HARTA / ASSET INFORMATION</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nama Harta:</Text>
            <Text style={styles.detailValue}>{assetName}</Text>
          </View>
          
          {assetValue && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Nilai Harta:</Text>
              <Text style={styles.detailValue}>RM {assetValue.toLocaleString()}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Jenis Pengagihan:</Text>
            <Text style={styles.detailValue}>{getDistributionTypeDisplay(distributionType)}</Text>
          </View>
          
          {assetDescription && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Penerangan:</Text>
              <Text style={styles.detailValue}>{assetDescription}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tarikh Perjanjian:</Text>
            <Text style={styles.detailValue}>{format(new Date(createdAt), 'dd MMMM yyyy')}</Text>
          </View>
        </View>

        {/* Beneficiaries Table */}
        <View style={styles.beneficiarySection}>
          <Text style={styles.sectionTitle}>SENARAI PENERIMA / BENEFICIARIES LIST</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Bil.</Text>
            <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Nama</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>No. K/P</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Hubungan</Text>
          </View>
          
          {/* Table Rows */}
          {beneficiaries.map((agreement, index) => (
            <View key={agreement.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '10%' }]}>{index + 1}</Text>
              <Text style={[styles.tableCell, { width: '40%' }]}>
                {agreement.familyMember?.fullName}
              </Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>
                {agreement.familyMember?.ic}
              </Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>
                {agreement.familyMember?.relationship}
              </Text>
            </View>
          ))}
        </View>

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.sectionTitle}>TERMA DAN SYARAT / TERMS AND CONDITIONS</Text>
          
          <Text style={styles.termItem}>
            <Text style={styles.termNumber}>1. </Text>
            Perjanjian ini dibuat mengikut undang-undang Malaysia dan peraturan yang berkaitan dengan pengagihan harta.
          </Text>
          
          <Text style={styles.termItem}>
            <Text style={styles.termNumber}>2. </Text>
            Semua pihak yang terlibat bersetuju untuk mematuhi syarat-syarat yang ditetapkan dalam perjanjian ini.
          </Text>
          
          <Text style={styles.termItem}>
            <Text style={styles.termNumber}>3. </Text>
            Pengagihan harta akan dilaksanakan setelah mendapat kelulusan daripada pihak berkuasa yang berkaitan.
          </Text>
          
          <Text style={styles.termItem}>
            <Text style={styles.termNumber}>4. </Text>
            Sebarang perubahan kepada perjanjian ini mesti mendapat persetujuan bertulis daripada semua pihak.
          </Text>
          
          <Text style={styles.termItem}>
            <Text style={styles.termNumber}>5. </Text>
            Perjanjian ini berkuat kuasa setelah ditandatangani oleh semua pihak yang berkaitan.
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <Text style={styles.signatureTitle}>TANDATANGAN / SIGNATURES</Text>
          
          {/* Family Member Signatures */}
          {beneficiaries.map((agreement) => (
            <View key={agreement.id} style={styles.signatureBlock}>
              <Text style={styles.signatureRole}>PENERIMA HARTA / BENEFICIARY</Text>
              
              {agreement.signedAt ? (
                <View>
                  <View style={styles.signatureRow}>
                    <Text style={styles.signatureLabel}>Nama:</Text>
                    <Text style={styles.signatureValue}>
                      {agreement.familyMember?.fullName.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.signatureRow}>
                    <Text style={styles.signatureLabel}>Tandatangan:</Text>
                    <Text style={styles.signatureValue}>
                      (Ditandatangani secara digital pada {format(new Date(agreement.signedAt), 'dd/MM/yyyy HH:mm')})
                    </Text>
                  </View>
                  {agreement.transactionHash && (
                    <View style={styles.signatureRow}>
                      <Text style={styles.signatureLabel}>Tx Hash:</Text>
                      <Text style={styles.signatureValue}>{agreement.transactionHash}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View>
                  <View style={styles.signatureRow}>
                    <Text style={styles.signatureLabel}>Nama:</Text>
                    <Text style={styles.signatureValue}>
                      {agreement.familyMember?.fullName.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.signatureRow}>
                    <Text style={styles.signatureLabel}>Tandatangan:</Text>
                    <View style={styles.signatureLine} />
                  </View>
                  <View style={styles.signatureRow}>
                    <Text style={styles.signatureLabel}>Tarikh:</Text>
                    <Text style={styles.signatureValue}>_________________</Text>
                  </View>
                </View>
              )}
            </View>
          ))}

          {/* Government Official Signature */}
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureRole}>PEGAWAI AGENSI / AGENCY OFFICER</Text>
            
            {adminSignedAt ? (
              <View>
                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabel}>Nama:</Text>
                  <Text style={styles.signatureValue}>{displayAdminName}</Text>
                </View>
                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabel}>Tandatangan:</Text>
                  <Text style={styles.signatureValue}>
                    (Disahkan secara digital pada {format(new Date(adminSignedAt), 'dd/MM/yyyy HH:mm')})
                  </Text>
                </View>
                {adminNotes && (
                  <View style={styles.signatureRow}>
                    <Text style={styles.signatureLabel}>Catatan:</Text>
                    <Text style={styles.signatureValue}>{adminNotes}</Text>
                  </View>
                )}
                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabel}>Jawatan:</Text>
                  <Text style={styles.signatureValue}>Penolong Pengarah, Jabatan Harta Pusaka</Text>
                </View>
              </View>
            ) : isCompleted ? (
              <View>
                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabel}>Nama:</Text>
                  <Text style={styles.signatureValue}>{displayAdminName}</Text>
                </View>
                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabel}>Tandatangan:</Text>
                  <Text style={styles.signatureValue}>
                    (Disahkan secara digital pada {format(new Date(), 'dd/MM/yyyy HH:mm')})
                  </Text>
                </View>
                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabel}>Jawatan:</Text>
                  <Text style={styles.signatureValue}>Penolong Pengarah, Jabatan Harta Pusaka</Text>
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabel}>Nama:</Text>
                  <Text style={styles.signatureValue}>_________________________________</Text>
                </View>
                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabel}>Tandatangan:</Text>
                  <View style={styles.signatureLine} />
                </View>
                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabel}>Tarikh:</Text>
                  <Text style={styles.signatureValue}>_________________</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Official Section */}
        <View style={styles.officialSection}>
          <Text style={styles.officialText}>
            DOKUMEN INI ADALAH SAH DAN DIKELUARKAN OLEH
          </Text>
          <Text style={styles.officialText}>
            WILL & ESTATE MANAGEMENT SOLUTION PROVIDER (WEMSP)
          </Text>
          <Text style={styles.officialText}>
            THIS DOCUMENT IS VALID AND ISSUED BY
          </Text>
          <Text style={styles.officialText}>
            WILL & ESTATE MANAGEMENT SOLUTION PROVIDER (WEMSP)
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Dokumen ini dijana secara automatik oleh sistem digital pada {format(new Date(), 'dd MMMM yyyy, HH:mm')}
          </Text>
          <Text style={styles.footerText}>
            This document is automatically generated by digital system on {format(new Date(), 'dd MMMM yyyy, HH:mm')}
          </Text>
          <Text style={styles.footerText}>
            Rujukan: WEM/{agreementNumber}/{format(new Date(createdAt), 'yyyy')}
          </Text>
        </View>
      </Page>
    </>
  );
} 