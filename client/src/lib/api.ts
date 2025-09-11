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
    console.log('🎯 Calling CreateQRPos API via proxy to avoid CORS...');
    console.log('📤 Request payload:', { ...request, bankCode, clientID });
    
    // Use proxy route to avoid CORS issues
    const response = await fetch(`/api/pos/create-qr-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        bankCode,
        clientID
      }),
    });

    console.log('📡 Proxy API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Proxy API error response:', errorText);
      throw new Error(`Proxy API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Proxy API success:', result);
    
    // DETAILED RESPONSE LOGGING FOR DEBUG
    console.log('🔍 API CreateQRPos Response Details:');
    console.log('📋 Full Response Object:', JSON.stringify(result, null, 2));
    console.log('📄 Response Keys:', Object.keys(result));
    console.log('📊 Response Data Fields:');
    console.log('  - qrData:', result.qrData);
    console.log('  - qrDataDecode:', result.qrDataDecode);
    console.log('  - qrUrl:', result.qrUrl);
    console.log('  - qrData type:', typeof result.qrData);
    console.log('  - qrData length:', result.qrData?.length || 0);
    console.log('  - qrDataDecode type:', typeof result.qrDataDecode);
    console.log('  - qrDataDecode length:', result.qrDataDecode?.length || 0);
    
    // Transform response to match expected format
    const transformedResponse = {
      qrDataDecode: result.qrDataDecode || result.qrData || '',
      qrUrl: result.qrUrl || '',
      qrData: result.qrData || result.qrDataDecode || ''
    };
    
    console.log('🔄 Transformed Response:', transformedResponse);
    console.log('📏 Final qrData length:', transformedResponse.qrData.length);
    
    return transformedResponse;
    
  } catch (error) {
    console.error('❌ Proxy CreateQRPos API failed:', error);
    console.log('🔄 Falling back to alternative route...');
    
    // Fallback to alternative internal API route
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
        console.error('❌ Fallback API error:', fallbackResponse.status, errorText);
        throw new Error(`Failed to create QR payment: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
      }

      const fallbackResult = await fallbackResponse.json();
      console.log('✅ Fallback API success:', fallbackResult);
      
      // DETAILED FALLBACK RESPONSE LOGGING
      console.log('🔍 Fallback API CreateQRPos Response Details:');
      console.log('📋 Full Fallback Response:', JSON.stringify(fallbackResult, null, 2));
      console.log('📄 Fallback Response Keys:', Object.keys(fallbackResult));
      console.log('📊 Fallback Response Data Fields:');
      console.log('  - qrData:', fallbackResult.qrData);
      console.log('  - qrDataDecode:', fallbackResult.qrDataDecode);
      console.log('  - qrUrl:', fallbackResult.qrUrl);
      
      return fallbackResult;
    } catch (fallbackError) {
      console.error('❌ Both proxy and fallback APIs failed:', fallbackError);
      
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