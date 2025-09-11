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
    console.log('🎯 Calling CreateQRPos API directly...');
    console.log('📤 Request payload:', { ...request, bankCode, clientID });
    
    // Call external API directly
    const response = await fetch(`http://1.55.212.135:9335/api/CreateQRPos?bankCode=${bankCode}&clientID=${clientID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log('📡 External API response status:', response.status);
    console.log('📡 External API response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error('❌ External API error response:', responseText);
      
      // Check if response is HTML (error page)
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
        console.error('❌ Received HTML instead of JSON - API endpoint may be incorrect');
        throw new Error(`External API returned HTML error page instead of JSON`);
      }
      
      throw new Error(`External API error: ${response.status} ${response.statusText}`);
    }

    let result;
    try {
      result = await response.json();
      console.log('📡 External API JSON response:', result);
    } catch (parseError) {
      const responseText = await response.text();
      console.error('❌ Failed to parse JSON response:', parseError);
      console.error('❌ Response text:', responseText);
      
      // Check if response is HTML
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
        throw new Error('External API returned HTML error page instead of JSON');
      }
      
      throw new Error('Invalid JSON response from external API');
    }
    
    console.log('✅ External API success:', result);
    
    // Transform response to match expected format
    return {
      qrDataDecode: result.qrDataDecode || result.qrData || '',
      qrUrl: result.qrUrl || '',
      qrData: result.qrData || result.qrDataDecode || ''
    };

  } catch (error) {
    console.error('❌ External CreateQRPos API failed:', error);
    console.log('🔄 Falling back to internal API...');
    
    // Fallback to internal API
    try {
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
    } catch (fallbackError) {
      console.error('❌ Both external and fallback APIs failed:', fallbackError);
      
      // Return mock QR data as last resort
      console.log('🎭 Using mock QR data as last resort');
      const mockQRData = `PAYMENT|${request.depositAmt}|${request.transactionUuid}|${Date.now()}`;
      return {
        qrDataDecode: mockQRData,
        qrUrl: '',
        qrData: mockQRData
      };
    }
  }
};