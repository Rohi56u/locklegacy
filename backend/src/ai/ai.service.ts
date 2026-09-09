import { Injectable, Logger } from '@nestjs/common';

export interface ExtractedField {
  fieldName: string;
  value: string;
  confidence: number;
  requiresHumanConfirmation: boolean;
}

export interface DocumentOcrResult {
  documentType: string;
  rawTextPreview: string;
  extractedFields: ExtractedField[];
  missingRequiredFields: string[];
  aiNotice: string;
}

export interface DossierAssetItem {
  institution: string;
  category: string;
  maskedIdentifier: string;
  verificationStatus: string;
  requiredDocuments: string[];
  claimPortalUrl?: string;
  contactNotes?: string;
}

export interface GeneratedDossier {
  caseId: string;
  title: string;
  preparedAt: string;
  claimantSummary: {
    name: string;
    relationship: string;
    verificationStatus: string;
  };
  assetInventory: DossierAssetItem[];
  documentChecklist: { name: string; status: 'VERIFIED' | 'SUBMITTED' | 'REQUIRED' }[];
  reviewerNotes?: string;
  disclaimer: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /**
   * OCR extraction bounded strictly to field parsing with confidence indicators.
   * AI NEVER certifies validity or authenticity of death or documents.
   */
  async extractDeathCertificateFields(fileName: string, base64Preview?: string): Promise<DocumentOcrResult> {
    this.logger.log(`[AI-OCR] Processing document OCR parsing for: ${fileName}`);
    
    // Structured extraction with confidence metrics (simulated/pluggable engine)
    const extractedFields: ExtractedField[] = [
      {
        fieldName: 'deceasedName',
        value: 'Eleanor R. Vance',
        confidence: 0.94,
        requiresHumanConfirmation: false,
      },
      {
        fieldName: 'dateOfDeath',
        value: '2024-10-14',
        confidence: 0.91,
        requiresHumanConfirmation: false,
      },
      {
        fieldName: 'certificateNumber',
        value: 'DC-8849-02',
        confidence: 0.82,
        requiresHumanConfirmation: true, // flagged for human review
      },
      {
        fieldName: 'issuingAuthority',
        value: 'Department of Public Health & Vital Statistics',
        confidence: 0.88,
        requiresHumanConfirmation: false,
      },
    ];

    return {
      documentType: 'DEATH_CERTIFICATE',
      rawTextPreview: 'CERTIFICATE OF DEATH - STATE REGISTRATION VITAL STATISTICS...',
      extractedFields,
      missingRequiredFields: [],
      aiNotice: 'Notice: AI extracts text fields for human reviewer convenience only. Final certification requires authorized human reviewer approval.',
    };
  }

  /**
   * Assembles verified asset inventory into an institution-specific claim preparation dossier.
   */
  async compileDossier(
    caseId: string,
    claimant: { name: string; relationship: string; verified: boolean },
    rawRecords: Array<{ category: string; maskedPreview?: string; tags?: string[] }>,
  ): Promise<GeneratedDossier> {
    const assetInventory: DossierAssetItem[] = rawRecords.map((r) => {
      const cat = r.category || 'FINANCIAL';
      let reqDocs = ['Certified Death Certificate', 'Claimant Government ID'];
      let portalUrl = 'https://institution.com/estate-claim';
      
      if (cat === 'BANK') {
        reqDocs.push('Letter of Administration or Probate Grant', 'Affidavit of Heirship');
      } else if (cat === 'INSURANCE') {
        reqDocs.push('Original Policy Document', 'Physician Statement Form');
      } else if (cat === 'INVESTMENT') {
        reqDocs.push('Folio Transmission Form', 'KYC Client Verification');
      } else if (cat === 'CRYPTO') {
        reqDocs.push('Estate Discovery Reference Note', 'Hardware Device Transfer Receipt');
        portalUrl = 'https://exchange.com/recovery';
      }

      return {
        institution: r.maskedPreview ? r.maskedPreview.split('•')[0].trim() : 'Registered Institution',
        category: cat,
        maskedIdentifier: r.maskedPreview || '••••••••',
        verificationStatus: 'RECORD_SEALED',
        requiredDocuments: reqDocs,
        claimPortalUrl: portalUrl,
        contactNotes: 'Prepared under LegacyLock scoped continuity protocol.',
      };
    });

    return {
      caseId,
      title: 'Institution-Specific Claim-Preparation Dossier',
      preparedAt: new Date().toISOString(),
      claimantSummary: {
        name: claimant.name,
        relationship: claimant.relationship,
        verificationStatus: claimant.verified ? 'VERIFIED' : 'PENDING_HUMAN_REVIEW',
      },
      assetInventory,
      documentChecklist: [
        { name: 'Certified Death Certificate', status: 'SUBMITTED' },
        { name: 'Claimant Identity Verification (KYC)', status: claimant.verified ? 'VERIFIED' : 'SUBMITTED' },
        { name: 'Affidavit of Domicile', status: 'REQUIRED' },
      ],
      disclaimer: 'LegacyLock is a claim preparation & discovery system. No automated asset transfer is performed. All distributions are governed by the respective institutions KYC and probate rules.',
    };
  }
}
