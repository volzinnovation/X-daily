#!/usr/bin/env python3
"""
Generate icon files for the X-Daily extension.
Creates icons with an X logo and "2" and "4" on a black background.
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    """Create an icon of the specified size."""
    # Create a black background
    img = Image.new('RGB', (size, size), color='black')
    draw = ImageDraw.Draw(img)
    
    # Calculate padding and dimensions
    padding = size // 8
    center_x = size // 2
    center_y = size // 2
    
    # Draw the X (diagonal lines from corners)
    line_width = max(2, size // 12)
    
    # Top-left to bottom-right diagonal
    draw.line(
        [(padding, padding), (size - padding, size - padding)],
        fill='white',
        width=line_width
    )
    
    # Top-right to bottom-left diagonal
    draw.line(
        [(size - padding, padding), (padding, size - padding)],
        fill='white',
        width=line_width
    )
    
    # Add numbers "2" and "4" on either side of the X
    font_size = max(8, int(size * 0.35))
    font = None
    
    # Try to load a system font (macOS paths)
    font_paths = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    
    for font_path in font_paths:
        try:
            if font_path.endswith('.ttc'):
                # For .ttc files, we might need to specify index
                font = ImageFont.truetype(font_path, font_size, index=0)
            else:
                font = ImageFont.truetype(font_path, font_size)
            # Test if font works
            try:
                draw.textbbox((0, 0), "2", font=font)
                break
            except:
                font = None
                continue
        except Exception as e:
            font = None
            continue
    
    # If no font loaded, try to load default but with a minimum size
    if font is None:
        try:
            # Try loading a bitmap font
            font = ImageFont.load_default()
            # Test it
            try:
                draw.textbbox((0, 0), "2", font=font)
            except:
                font = None
        except:
            font = None
    
    # Position numbers - adjust offset based on size for better visibility
    number_offset_x = int(size * 0.32)
    
    if font:
        # Helper function to get text dimensions safely
        def get_text_size(text, font_obj):
            try:
                bbox = draw.textbbox((0, 0), text, font=font_obj)
                return (bbox[2] - bbox[0], bbox[3] - bbox[1])
            except:
                try:
                    # Fallback for older PIL versions
                    return font_obj.getsize(text)
                except:
                    # Estimate based on font size
                    return (font_size // 2, font_size)
            return (font_size // 2, font_size)
        
        # Draw "2" to the left (positioned 10% higher)
        try:
            text_width, text_height = get_text_size("2", font)
            y_offset = int(size * 0.1)  # 10% higher
            draw.text(
                (center_x - number_offset_x - text_width // 2, center_y - text_height // 2 - y_offset),
                "2",
                fill='white',
                font=font
            )
        except:
            pass
        
        # Draw "4" to the right (positioned 10% higher)
        try:
            text_width, text_height = get_text_size("4", font)
            y_offset = int(size * 0.1)  # 10% higher
            draw.text(
                (center_x + number_offset_x - text_width // 2, center_y - text_height // 2 - y_offset),
                "4",
                fill='white',
                font=font
            )
        except:
            pass
    else:
        # Fallback: draw numbers as simple shapes if font fails
        # Draw "2" as simple lines (positioned 10% higher)
        num_size = size // 4
        num_x_left = center_x - number_offset_x
        y_offset = int(size * 0.1)  # 10% higher
        num_y = center_y - num_size // 2 - y_offset
        
        # Simple "2" shape
        line_w = max(1, size // 20)
        # Top horizontal
        draw.line([(num_x_left - num_size//3, num_y), (num_x_left + num_size//3, num_y)], fill='white', width=line_w)
        # Top-right diagonal
        draw.line([(num_x_left + num_size//3, num_y), (num_x_left + num_size//3, num_y + num_size//3)], fill='white', width=line_w)
        # Middle horizontal
        draw.line([(num_x_left - num_size//3, num_y + num_size//3), (num_x_left + num_size//3, num_y + num_size//3)], fill='white', width=line_w)
        # Bottom-left diagonal
        draw.line([(num_x_left - num_size//3, num_y + num_size//3), (num_x_left - num_size//3, num_y + num_size)], fill='white', width=line_w)
        # Bottom horizontal
        draw.line([(num_x_left - num_size//3, num_y + num_size), (num_x_left + num_size//3, num_y + num_size)], fill='white', width=line_w)
        
        # Simple "4" shape
        num_x_right = center_x + number_offset_x
        # Vertical line
        draw.line([(num_x_right, num_y), (num_x_right, num_y + num_size)], fill='white', width=line_w)
        # Top horizontal
        draw.line([(num_x_right - num_size//3, num_y + num_size//3), (num_x_right, num_y + num_size//3)], fill='white', width=line_w)
        # Diagonal
        draw.line([(num_x_right - num_size//3, num_y), (num_x_right, num_y + num_size//3)], fill='white', width=line_w)
    
    return img

def main():
    """Generate all three icon sizes."""
    sizes = [16, 48, 128]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    for size in sizes:
        icon = create_icon(size)
        output_path = os.path.join(script_dir, f"icon{size}.png")
        icon.save(output_path, 'PNG')
        print(f"Created {output_path} ({size}x{size})")

if __name__ == "__main__":
    main()
