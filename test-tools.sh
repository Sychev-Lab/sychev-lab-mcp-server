#!/bin/bash

# Test script for MCP Server Tools
# Usage: ./test-tools.sh [tool_name]

BASE_URL="http://localhost:3456"
API_KEY="dev-key-change-in-production"
AUTH_HEADER="Authorization: Bearer ${API_KEY}"
CONTENT_TYPE="Content-Type: application/json"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to make API call
call_tool() {
    local tool_name=$1
    local payload=$2
    
    echo -e "\n${YELLOW}Testing: $tool_name${NC}"
    echo "Payload: $payload"
    
    response=$(curl -s -X POST "${BASE_URL}/mcp/v1/tools/call" \
        -H "$AUTH_HEADER" \
        -H "$CONTENT_TYPE" \
        -d "$payload" 2>&1)
    
    # Check if response contains error
    if echo "$response" | grep -q '"isError":true'; then
        echo -e "${RED}FAILED${NC}"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        return 1
    elif echo "$response" | grep -q '"isError":false'; then
        echo -e "${GREEN}SUCCESS${NC}"
        # Show truncated response
        echo "$response" | python3 -m json.tool 2>/dev/null | head -30
        return 0
    else
        echo -e "${RED}UNKNOWN RESPONSE${NC}"
        echo "$response"
        return 1
    fi
}

# Check if server is running
echo "Checking if MCP server is running..."
if ! curl -s "${BASE_URL}/mcp/v1/tools/list" -H "$AUTH_HEADER" -H "$CONTENT_TYPE" -d '{}' > /dev/null 2>&1; then
    echo -e "${RED}ERROR: MCP server is not running on ${BASE_URL}${NC}"
    echo "Start it with: node dist/index.js --http 3456"
    exit 1
fi

echo -e "${GREEN}MCP server is running${NC}"

# Test specific tool or all
if [ -n "$1" ]; then
    TOOL_NAME=$1
    echo "Testing single tool: $TOOL_NAME"
else
    echo "Testing all tools..."
fi

# Test 1: list_products
echo -e "\n========================================"
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "list_products" ]; then
    call_tool "list_products" '{"name": "list_products", "arguments": {}}'
fi

# Test 2: get_product_details
echo -e "\n========================================"
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "get_product_details" ]; then
    call_tool "get_product_details" '{"name": "get_product_details", "arguments": {"productId": "7b132f26-ec20-4e97-8f20-416c6d75d933", "lang": "es"}}'
fi

# Test 3: search_products_by_category (with category)
echo -e "\n========================================"
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "search_products_by_category" ]; then
    call_tool "search_products_by_category (with category)" '{"name": "search_products_by_category", "arguments": {"categoryId": "Airsoft", "limit": 5}}'
fi

# Test 4: search_products_by_category (without category - all products)
echo -e "\n========================================"
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "search_products_by_category" ]; then
    call_tool "search_products_by_category (all products)" '{"name": "search_products_by_category", "arguments": {"limit": 5}}'
fi

# Test 5: get_categories
echo -e "\n========================================"
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "get_categories" ]; then
    call_tool "get_categories" '{"name": "get_categories", "arguments": {}}'
fi

# Test 6: list_articles
echo -e "\n========================================"
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "list_articles" ]; then
    call_tool "list_articles" '{"name": "list_articles", "arguments": {}}'
fi

# Test 7: get_article
echo -e "\n========================================"
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "get_article" ]; then
    # First get articles list to find a valid ID
    articles_response=$(curl -s "https://lab.sychev.xyz/api/lab/index.articles.json" 2>&1)
    article_id=$(echo "$articles_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))" 2>/dev/null)
    
    if [ -n "$article_id" ]; then
        call_tool "get_article" "{\"name\": \"get_article\", \"arguments\": {\"articleId\": \"$article_id\", \"lang\": \"es\"}}"
    else
        echo -e "${YELLOW}SKIPPED: No articles found to test${NC}"
    fi
fi

# Test 8: list_tutorials
echo -e "\n========================================"
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "list_tutorials" ]; then
    call_tool "list_tutorials" '{"name": "list_tutorials", "arguments": {}}'
fi

# Test 9: get_tutorial
echo -e "\n========================================"
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "get_tutorial" ]; then
    # First get tutorials list to find a valid ID
    tutorials_response=$(curl -s "https://lab.sychev.xyz/api/lab/index.tutorials.json" 2>&1)
    tutorial_id=$(echo "$tutorials_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))" 2>/dev/null)
    
    if [ -n "$tutorial_id" ]; then
        call_tool "get_tutorial" "{\"name\": \"get_tutorial\", \"arguments\": {\"tutorialId\": \"$tutorial_id\", \"lang\": \"es\"}}"
    else
        echo -e "${YELLOW}SKIPPED: No tutorials found to test${NC}"
    fi
fi

# Test 10: register_user (will fail with existing email, but tests the endpoint)
echo -e "\n========================================"
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "register_user" ]; then
    call_tool "register_user (new random email)" "{\"name\": \"register_user\", \"arguments\": {\"email\": \"test_$(date +%s)@example.com\", \"password\": \"testpass123\", \"displayName\": \"Test User\"}}"
fi

# Test 11: create_stripe_checkout (secure - solo necesita productId)
echo -e "\n========================================"
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "create_stripe_checkout" ]; then
    # Nota: Usar un UUID válido de producto existente en Firestore
    call_tool "create_stripe_checkout" '{"name": "create_stripe_checkout", "arguments": {"productId": "550e8400-e29b-41d4-a716-446655440000", "quantity": 1, "guestEmail": "test@example.com", "guestName": "Test User", "locale": "es"}}'
fi

echo -e "\n========================================"
echo -e "${GREEN}Test completed${NC}"
