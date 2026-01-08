import os
import json
from openai import OpenAI
from pydantic import BaseModel, Field
from typing import List, Optional

# Initialize OpenAI client (will use OPENAI_API_KEY from env)
# We lazily initialize this in the function to avoid errors if key is missing during app startup
client = None

class ProfilePrediction(BaseModel):
    goal: str = Field(..., description="Investment goal: 'growth', 'balanced', or 'income'")
    risk_score: int = Field(..., description="Risk tolerance from 0 (Safe) to 100 (Aggressive)")
    horizon: str = Field(..., description="Time horizon: 'short', 'medium', or 'long'")
    anchor_stock: str = Field(..., description="Suggested anchor stock symbol (e.g. 'SBK.JO', 'VOD.JO') based on user text")
    interests: List[str] = Field(..., description="List of sectors/interests identified in text")
    rationale: str = Field(..., description="Short explanation of why this profile was chosen")

def get_client():
    global client
    if client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return None
        client = OpenAI(api_key=api_key)
    return client

def analyze_user_profile(user_text: str) -> dict:
    """
    Analyzes free-text user input and returns a structured profile configuration.
    """
    client = get_client()
    if not client:
        return {
            "error": "OpenAI API key not configured", 
            "is_fallback": True
        }

    system_prompt = """
    You are an expert financial advisor for South African retail investors. 
    Your job is to analyze a user's free-text description of their life/goals 
    and map it to specific structured parameters for the StockBuddy app.
    
    PARAMETERS TO MAP:
    1. goal: 'growth' (wealth building), 'balanced' (growth+safety), or 'income' (dividends).
    2. risk_score: 0-100 (0=Cash/Bonds, 50=Balanced, 100=All Equity/Crypto).
    3. horizon: 'short' (<3 yrs), 'medium' (3-7 yrs), 'long' (7+ yrs).
    4. anchor_stock: Pick ONE best-fit JSE stock symbol from this list:
       - SBK.JO (Standard Bank) - Stability, dividends
       - FSR.JO (FirstRand) - Banking leader
       - CPI.JO (Capitec) - Growth banking
       - VOD.JO (Vodacom) - Defensive, dividends
       - MTN.JO (MTN Group) - Telco, emerging market exposure
       - NPN.JO (Naspers/Prosus) - Tech/Tencent exposure, high growth
       - SOL.JO (Sasol) - Resources, volatility
       - SHP.JO (Shoprite) - Retail defensive
    5. interests: Extract key themes (e.g. 'Tech', 'Banks', 'Retail', 'Mining').
    
    Response must be valid JSON matching the ProfilePrediction schema.
    """

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text}
            ],
            response_format={ "type": "json_object" },
            temperature=0.7,
        )
        
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Empty response from AI")
            
        # Parse JSON
        result = json.loads(content)
        
        # Enforce defaults if AI missed something (defensive coding)
        result["goal"] = result.get("goal", "balanced").lower()
        if result["goal"] not in ["growth", "balanced", "income"]:
            result["goal"] = "balanced"
            
        return result

    except Exception as e:
        print(f"AI Analysis Error: {str(e)}")
        # Fallback to a safe default if AI fails
        return {
            "goal": "balanced",
            "risk_score": 50,
            "horizon": "medium",
            "anchor_stock": "SBK.JO",
            "interests": ["Diversified"],
            "rationale": f"Debug mode: The AI failed with error: {str(e)}",
            "is_error": True
        }

def chat_with_advisor(message: str, context: dict) -> str:
    """
    Engages in a conversation with the user, aware of their portfolio context.
    """
    client = get_client()
    if not client:
        return "I'm sorry, my brain (OpenAI Key) is not connected yet. Please check your settings."

    # Format context for the AI
    holdings_summary = []
    if context.get("holdings"):
        for h in context["holdings"]:
            holdings_summary.append(f"- {h['symbol']}: {h['shares']} shares @ R{h['avg_price']} (Current: R{h['current_price']})")
    
    holdings_text = "\n".join(holdings_summary) if holdings_summary else "No current holdings."
    
    total_value = context.get('total_value', 0)
    pnl_pct = context.get('total_pnl_pct', 0)
    
    system_prompt = f"""
    You are 'StockBuddy', a helpful and encouraging investment assistant for a South African user.
    
    USER PORTFOLIO CONTEXT:
    - Total Value: R{total_value:,.2f}
    - Overall Return: {pnl_pct}%
    - Holdings:
    {holdings_text}
    
    YOUR ROLE:
    1. Answer questions about their specific portfolio.
    2. Explain financial concepts simply (no jargon).
    3. If they ask to sell or buy, give advice but clarify you cannot execute trades yet.
    4. Keep answers short (under 3 sentences) unless asked for detail.
    
    TONE: Friendly, educational, professional.
    """

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
        )
        
        return completion.choices[0].message.content or "I'm not sure how to answer that."

    except Exception as e:
        print(f"AI Chat Error: {str(e)}")
        return "I'm having trouble thinking right now. Please try again later."
