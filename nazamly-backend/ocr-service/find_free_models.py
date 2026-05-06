import urllib.request
import json

def find_free_vision_models():
    url = "https://openrouter.ai/api/v1/models"
    print("Fetching OpenRouter models...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read())
        
    free_vision_models = []
    
    for m in data.get("data", []):
        pricing = m.get("pricing", {})
        if pricing.get("prompt") == "0" and pricing.get("completion") == "0":
            arch = m.get("architecture", {})
            modality = arch.get("modality", "")
            if "image->text" in modality or arch.get("vision", False) or "image" in modality:
                free_vision_models.append(m["id"])
                
    print("\n--- FREE OpenRouter Vision Models ---")
    for mid in free_vision_models:
        print(f'"{mid}"')
    print("-------------------------------------")

if __name__ == "__main__":
    find_free_vision_models()
