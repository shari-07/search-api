<?php
/**
 * Script to generate a new Taobao access token
 * Native implementation based on TaobaoAPI.ts
 * 
 * Usage:
 *   php generate_token.php [code]
 *   php generate_token.php YOUR_AUTHORIZATION_CODE
 * 
 * Or set environment variables:
 *   export TAOBAO_APP_KEY=your_app_key
 *   export TAOBAO_APP_SECRET=your_app_secret
 *   php generate_token.php YOUR_AUTHORIZATION_CODE
 */

// Get configuration from environment variables, command line, or defaults
$appKey = getenv('TAOBAO_APP_KEY') ?: 'YOUR_APP_KEY';
$appSecret = getenv('TAOBAO_APP_SECRET') ?: 'YOUR_APP_SECRET';
$code = $argv[1] ?? getenv('TAOBAO_CODE') ?: 'YOUR_AUTHORIZATION_CODE';

// Validate configuration
if ($appKey === 'YOUR_APP_KEY' || $appSecret === 'YOUR_APP_SECRET' || $code === 'YOUR_AUTHORIZATION_CODE') {
    echo "Error: Please provide APP_KEY, APP_SECRET, and CODE.\n";
    echo "\nOptions:\n";
    echo "  1. Set environment variables: TAOBAO_APP_KEY, TAOBAO_APP_SECRET\n";
    echo "  2. Pass CODE as command line argument: php generate_token.php YOUR_CODE\n";
    echo "  3. Update values directly in the script\n";
    exit(1);
}

/**
 * Generates the HMAC-SHA256 signature based on the official Taobao Global documentation.
 * @param array $params The request query parameters
 * @param string $apiName The API path name (e.g., /auth/token/create)
 * @param string $appSecret The application secret key
 * @return string The uppercase HEX signature string
 */
function generateSignature(array $params, string $apiName, string $appSecret): string {
    // 1. Sort all request parameters based on the parameter names in ASCII order
    ksort($params);
    
    // 2. Concatenate the sorted parameters and their values to form a string
    $paramString = '';
    foreach ($params as $key => $value) {
        // Skip null or undefined values
        if ($value !== null && $value !== '') {
            $paramString .= $key . $value;
        }
    }
    
    // 3. Add the API name to the beginning of the concatenated string
    $stringToSign = $apiName . $paramString;
    
    // 4. Encode the string in UTF-8, hash with HMAC-SHA256, and convert to hex
    $signature = hash_hmac('sha256', $stringToSign, $appSecret, false);
    
    // Convert to uppercase
    return strtoupper($signature);
}

/**
 * Makes a request to Taobao API endpoint
 * @param string $url The full API URL
 * @param string $apiPath The API path name (e.g., /auth/token/create)
 * @param array $params Request parameters
 * @param string $appKey Application key
 * @param string $appSecret Application secret
 * @return array|string The API response
 */
function makeTaobaoApiRequest(string $url, string $apiPath, array $params, string $appKey, string $appSecret) {
    // Add system parameters
    $systemParams = [
        'app_key' => $appKey,
        'sign_method' => 'sha256',
        'timestamp' => (string)(time() * 1000), // milliseconds timestamp
    ];
    
    // Merge parameters
    $allParams = array_merge($systemParams, $params);
    
    // Generate signature
    $signature = generateSignature($allParams, $apiPath, $appSecret);
    $allParams['sign'] = $signature;
    
    // Build query string
    $queryString = http_build_query($allParams);
    $fullUrl = $url . '?' . $queryString;
    
    // Initialize cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $fullUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
    ]);
    
    // Execute request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        throw new Exception("cURL Error: " . $error);
    }
    
    if ($httpCode !== 200) {
        throw new Exception("HTTP Error: " . $httpCode . " - " . $response);
    }
    
    // Parse JSON response
    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return $response; // Return raw response if not JSON
    }
    
    // Check for error response
    if (isset($data['error_response'])) {
        $error = $data['error_response'];
        throw new Exception(
            "[{$error['code']}] {$error['msg']}" . 
            (isset($error['request_id']) ? " (Request ID: {$error['request_id']})" : "")
        );
    }
    
    return $data;
}

try {
    // API endpoint for token creation
    // Adjust the base URL if needed (e.g., https://api.taobao.global or https://eco.taobao.com)
    $baseUrl = 'https://api.taobao.global/rest';
    $apiPath = '/auth/token/create';
    $url = $baseUrl . $apiPath;
    
    // Request parameters
    $params = [
        'code' => $code,
    ];
    
    echo "=== Requesting Token ===\n";
    echo "URL: $url\n";
    echo "Code: $code\n";
    echo "App Key: $appKey\n";
    echo "\n";
    
    // Execute the request
    $response = makeTaobaoApiRequest($url, $apiPath, $params, $appKey, $appSecret);
    
    // Display the response
    echo "=== Token Creation Response ===\n";
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    
    // Extract token if available
    if (isset($response['token_result']['access_token'])) {
        echo "\n=== Access Token ===\n";
        echo $response['token_result']['access_token'] . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
