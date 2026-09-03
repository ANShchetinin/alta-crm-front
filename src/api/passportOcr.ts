import { api } from './axiosConfig';

export interface BackendExtractedField {
  value: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'MRZ';
}

export interface BackendPassportOcrResponse {
  full_name: BackendExtractedField;
  last_name: BackendExtractedField;
  first_name: BackendExtractedField;
  middle_name: BackendExtractedField;
  birth_date: BackendExtractedField;
  gender: BackendExtractedField;
  passport_series_number: BackendExtractedField;
  passport_series: BackendExtractedField;
  passport_number: BackendExtractedField;
  passport_issued_by: BackendExtractedField;
  passport_issued_date: BackendExtractedField;
  passport_department_code: BackendExtractedField;
  registration_address: BackendExtractedField;
  registration_date: BackendExtractedField;
  raw_main_text: string;
  raw_reg_text: string;
  warnings: string[];
}

/**
 * Sends passport spread and optional registration stamp to Backend Neural OCR service.
 */
export async function scanPassportOnBackend(
  mainPageFile: File,
  regPageFile: File | null
): Promise<BackendPassportOcrResponse> {
  const formData = new FormData();
  formData.append('main_page', mainPageFile);
  if (regPageFile) {
    formData.append('reg_page', regPageFile);
  }

  const response = await api.post<BackendPassportOcrResponse>(
    '/documents/passport/scan',
    formData,
    {
      timeout: 90000
    }
  );

  return response.data;
}
