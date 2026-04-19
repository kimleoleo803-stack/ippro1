#!/usr/bin/env python3
"""
Backend testing for IPTV proxy endpoint
Tests all the scenarios specified in the review request
"""

import requests
import json
import sys
from urllib.parse import quote

# Use the preview URL from the review request
BASE_URL = "https://a13556e0-52e1-47d5-8a80-6dbde9017493.preview.emergentagent.com"
PROXY_ENDPOINT = f"{BASE_URL}/api/iptv-proxy"

def test_case(name, test_func):
    """Helper to run a test case and report results"""
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print('='*60)
    try:
        result = test_func()
        if result:
            print(f"✅ PASS: {name}")
            return True
        else:
            print(f"❌ FAIL: {name}")
            return False
    except Exception as e:
        print(f"❌ ERROR: {name} - {str(e)}")
        return False

def test_missing_url():
    """Test 1: Missing URL parameter should return 400"""
    print("Testing GET request without URL parameter...")
    response = requests.get(PROXY_ENDPOINT)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    print(f"Headers: {dict(response.headers)}")
    
    return response.status_code == 400 and "Missing 'url' query parameter" in response.text

def test_invalid_url():
    """Test 2: Invalid URL should return 400"""
    print("Testing GET request with invalid URL...")
    response = requests.get(f"{PROXY_ENDPOINT}?url=invalid-url")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    print(f"Headers: {dict(response.headers)}")
    
    return response.status_code == 400 and "Invalid or blocked URL" in response.text

def test_private_host_blocking():
    """Test 3: Private hosts should be blocked"""
    private_hosts = [
        "http://127.0.0.1:8080/test",
        "http://192.168.1.1/test", 
        "http://localhost/test"
    ]
    
    all_passed = True
    for host_url in private_hosts:
        print(f"Testing private host: {host_url}")
        encoded_url = quote(host_url, safe='')
        response = requests.get(f"{PROXY_ENDPOINT}?url={encoded_url}")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400 or "Invalid or blocked URL" not in response.text:
            all_passed = False
            print(f"❌ Failed to block private host: {host_url}")
        else:
            print(f"✅ Successfully blocked private host: {host_url}")
    
    return all_passed

def test_non_http_scheme():
    """Test 4: Non-http/https schemes should be blocked"""
    invalid_schemes = [
        "file:///etc/passwd",
        "ftp://example.com/file.txt"
    ]
    
    all_passed = True
    for scheme_url in invalid_schemes:
        print(f"Testing invalid scheme: {scheme_url}")
        encoded_url = quote(scheme_url, safe='')
        response = requests.get(f"{PROXY_ENDPOINT}?url={encoded_url}")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400 or "Invalid or blocked URL" not in response.text:
            all_passed = False
            print(f"❌ Failed to block invalid scheme: {scheme_url}")
        else:
            print(f"✅ Successfully blocked invalid scheme: {scheme_url}")
    
    return all_passed

def test_valid_url_passthrough():
    """Test 5a: Valid URL should proxy GET correctly with passthrough"""
    print("Testing valid URL with JSON response...")
    test_url = "https://httpbin.org/get"
    encoded_url = quote(test_url, safe='')
    response = requests.get(f"{PROXY_ENDPOINT}?url={encoded_url}")
    
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Response preview: {response.text[:200]}...")
    
    # Check for expected response
    success = (
        response.status_code == 200 and
        response.headers.get('x-proxy-kind') == 'passthrough' and
        'httpbin.org' in response.text
    )
    
    return success

def test_m3u8_rewriting():
    """Test 5b: M3U8 URL should be rewritten"""
    print("Testing M3U8 URL rewriting...")
    test_url = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
    encoded_url = quote(test_url, safe='')
    response = requests.get(f"{PROXY_ENDPOINT}?url={encoded_url}")
    
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Response preview: {response.text[:500]}...")
    
    # Check for expected response
    success = (
        response.status_code == 200 and
        response.headers.get('x-proxy-kind') == 'm3u8' and
        response.text.startswith('#EXTM3U') and
        '/api/iptv-proxy?url=' in response.text
    )
    
    return success

def test_post_json():
    """Test 6: POST with JSON responseType"""
    print("Testing POST request with JSON responseType...")
    payload = {
        "url": "https://httpbin.org/get",
        "responseType": "json"
    }
    response = requests.post(PROXY_ENDPOINT, json=payload)
    
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Response preview: {response.text[:200]}...")
    
    success = (
        response.status_code == 200 and
        'httpbin.org' in response.text
    )
    
    return success

def test_post_text_with_ua():
    """Test 7: POST with text responseType and custom User-Agent"""
    print("Testing POST request with text responseType and custom UA...")
    payload = {
        "url": "https://httpbin.org/headers",
        "responseType": "text",
        "ua": "MyBot/1.0"
    }
    response = requests.post(PROXY_ENDPOINT, json=payload)
    
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Response preview: {response.text[:500]}...")
    
    # Check if the custom User-Agent was forwarded
    success = (
        response.status_code == 200 and
        'MyBot/1.0' in response.text
    )
    
    return success

def test_binary_stream():
    """Test 8: Binary/stream URL should preserve content"""
    print("Testing binary stream URL...")
    test_url = "https://httpbin.org/bytes/4096"
    encoded_url = quote(test_url, safe='')
    response = requests.get(f"{PROXY_ENDPOINT}?url={encoded_url}")
    
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Content-Length: {response.headers.get('content-length')}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    print(f"Body size: {len(response.content)} bytes")
    
    success = (
        response.status_code == 200 and
        response.headers.get('x-proxy-kind') == 'passthrough' and
        len(response.content) == 4096
    )
    
    return success

def test_fake_m3u8_binary():
    """Test 9: Non-m3u8 content with .m3u8 in URL should not be rewritten"""
    print("Testing fake M3U8 URL (binary content)...")
    # Simulate by using a binary endpoint with .m3u8 in query
    test_url = "https://httpbin.org/bytes/512?x=.m3u8"
    encoded_url = quote(test_url, safe='')
    response = requests.get(f"{PROXY_ENDPOINT}?url={encoded_url}")
    
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    print(f"Body size: {len(response.content)} bytes")
    
    # Should be passthrough, not m3u8 rewriting
    success = (
        response.status_code == 200 and
        response.headers.get('x-proxy-kind') == 'passthrough' and
        len(response.content) == 512
    )
    
    return success

def test_cors_options():
    """Test 10: CORS OPTIONS request"""
    print("Testing CORS OPTIONS request...")
    response = requests.options(PROXY_ENDPOINT)
    
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Response: {response.text}")
    
    # Accept both 200 and 204 status codes (204 is valid for CORS preflight)
    success = (
        response.status_code in [200, 204] and
        response.headers.get('Access-Control-Allow-Origin') == '*' and
        ('GET' in response.headers.get('Access-Control-Allow-Methods', '') and
         'POST' in response.headers.get('Access-Control-Allow-Methods', '') and
         'OPTIONS' in response.headers.get('Access-Control-Allow-Methods', ''))
    )
    
    return success

def main():
    """Run all tests"""
    print(f"Testing IPTV Proxy Endpoint at: {PROXY_ENDPOINT}")
    print(f"Base URL: {BASE_URL}")
    
    tests = [
        ("Missing URL parameter", test_missing_url),
        ("Invalid URL", test_invalid_url),
        ("Private host blocking", test_private_host_blocking),
        ("Non-HTTP scheme blocking", test_non_http_scheme),
        ("Valid URL passthrough", test_valid_url_passthrough),
        ("M3U8 rewriting", test_m3u8_rewriting),
        ("POST JSON", test_post_json),
        ("POST text with User-Agent", test_post_text_with_ua),
        ("Binary stream", test_binary_stream),
        ("Fake M3U8 binary", test_fake_m3u8_binary),
        ("CORS OPTIONS", test_cors_options),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        if test_case(test_name, test_func):
            passed += 1
    
    print(f"\n{'='*60}")
    print(f"FINAL RESULTS: {passed}/{total} tests passed")
    print('='*60)
    
    if passed == total:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {total - passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())