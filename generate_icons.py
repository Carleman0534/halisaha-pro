from PIL import Image, ImageDraw, ImageFont
import math
import os

def create_icon(size):
    # Create image with RGBA
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background: Rounded rectangle with emerald gradient simulation
    radius = int(size * 0.22)
    
    # Base background: deep dark slate / emerald
    bg_color = (15, 23, 42, 255) # slate-900
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=bg_color)
    
    # Outer glowing border
    border_color = (16, 185, 129, 230) # emerald-500
    draw.rounded_rectangle([2, 2, size - 3, size - 3], radius=radius, outline=border_color, width=max(2, size // 40))
    
    # Inner subtle pitch lines
    cx, cy = size // 2, size // 2
    r = int(size * 0.34)
    pitch_line = (51, 65, 85, 180) # slate-700
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=pitch_line, width=max(1, size // 70))
    
    # Pitch center line
    draw.line([size * 0.15, cy, size * 0.85, cy], fill=pitch_line, width=max(1, size // 80))
    
    # Center soccer ball emblem
    ball_r = int(size * 0.23)
    ball_bg = (248, 250, 252, 255) # white
    draw.ellipse([cx - ball_r, cy - ball_r, cx + ball_r, cy + ball_r], fill=ball_bg)
    draw.ellipse([cx - ball_r, cy - ball_r, cx + ball_r, cy + ball_r], outline=(15, 23, 42, 255), width=max(2, size // 50))
    
    # Center pentagon of soccer ball
    pent_r = int(ball_r * 0.44)
    pent_pts = []
    for i in range(5):
        angle = math.radians(i * 72 - 90)
        px = cx + pent_r * math.cos(angle)
        py = cy + pent_r * math.sin(angle)
        pent_pts.append((px, py))
    draw.polygon(pent_pts, fill=(15, 23, 42, 255))
    
    # Soccer lines from pentagon to edges
    for i in range(5):
        angle = math.radians(i * 72 - 90)
        px = cx + pent_r * math.cos(angle)
        py = cy + pent_r * math.sin(angle)
        ex = cx + ball_r * math.cos(angle)
        ey = cy + ball_r * math.sin(angle)
        draw.line([(px, py), (ex, ey)], fill=(15, 23, 42, 255), width=max(1, size // 70))
        
    # Crown / Star or accent at top
    accent_color = (245, 158, 11, 255) # amber-500
    star_cy = int(size * 0.16)
    draw.ellipse([cx - size//25, star_cy - size//25, cx + size//25, star_cy + size//25], fill=accent_color)
    
    return img

out_dir = r"C:\Users\ASUS\.gemini\antigravity\scratch\halisaha-app\public"
os.makedirs(out_dir, exist_ok=True)

# Generate 512x512
img_512 = create_icon(512)
img_512.save(os.path.join(out_dir, "pwa-512x512.png"))

# Generate 192x192
img_192 = create_icon(192)
img_192.save(os.path.join(out_dir, "pwa-192x192.png"))

# Apple touch icon (180x180)
img_180 = create_icon(180)
img_180.save(os.path.join(out_dir, "apple-touch-icon.png"))

print("PWA Icons created successfully!")
