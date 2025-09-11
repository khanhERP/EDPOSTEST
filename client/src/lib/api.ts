export const loginPosAsync = async (request: LoginPosRequest): Promise<LoginResponse> => {
  const response = await fetch('/api/pos/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to login for QR payment');
  }

  return response.json();
};

export interface LoginPosRequest {
  clientID: string;
  clientSecret: string;
  masterId: string;
  bankCode: string;
}

export interface LoginResponse {
  token: string;
  // Add other response fields as needed
}

export interface CreateQRPosRequest {
  transactionUuid: string;
  depositAmt: number;
  posUniqueId: string;
  accntNo: string;
  posfranchiseeName: string;
  posCompanyName: string;
  posBillNo: string;
}

export interface CreateQRPosResponse {
  qrDataDecode: string;
  qrUrl: string;
  qrData: string;
}

export const createQRPosAsync = async (request: CreateQRPosRequest, bankCode: string, clientID: string): Promise<CreateQRPosResponse> => {
  try {
    console.log('🎯 Attempting to call external CreateQuickQr API...');
    
    // Try the new external API endpoint first
    const response = await fetch('http://1.55.212.135:9335/api/Ec/CreateQuickQr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        bankCode,
        clientID
      }),
    });

    console.log('📡 External API response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`External API error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('External API returned non-JSON response');
    }

    const result = await response.json();
    console.log('✅ External API success:', result);
    
    // Transform response to match expected format
    return {
      qrDataDecode: result.qrDataDecode || result.qrData || '',
      qrUrl: result.qrUrl || '',
      qrData: result.qrData || result.qrDataDecode || ''
    };

  } catch (error) {
    console.error('❌ External CreateQuickQr API failed:', error);
    console.log('🔄 Falling back to internal API...');
    
    // Fallback to internal API
    const fallbackResponse = await fetch(`/api/pos/create-qr?bankCode=${bankCode}&clientID=${clientID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!fallbackResponse.ok) {
      const errorText = await fallbackResponse.text();
      console.error('Fallback API error:', fallbackResponse.status, errorText);
      throw new Error(`Failed to create QR payment: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
    }

    const fallbackResult = await fallbackResponse.json();
    console.log('✅ Fallback API success:', fallbackResult);
    
    return fallbackResult;
  }
};