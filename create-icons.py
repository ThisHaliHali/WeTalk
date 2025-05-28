#!/usr/bin/env python3
"""
简单的图标生成脚本
生成WeTalk应用所需的PNG图标
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    """创建指定尺寸的图标"""
    # 创建图像
    img = Image.new('RGBA', (size, size), (0, 122, 255, 255))  # 蓝色背景
    draw = ImageDraw.Draw(img)
    
    # 绘制白色圆形边框
    margin = size // 20
    draw.ellipse([margin, margin, size-margin, size-margin], 
                 outline=(255, 255, 255, 255), width=size//40)
    
    # 绘制麦克风图标
    mic_width = size // 6
    mic_height = size // 4
    mic_x = size // 2 - mic_width // 2
    mic_y = size // 2 - mic_height // 2 - size // 10
    
    # 麦克风主体
    draw.rounded_rectangle([mic_x, mic_y, mic_x + mic_width, mic_y + mic_height],
                          radius=mic_width//2, fill=(255, 255, 255, 255))
    
    # 麦克风底座
    base_y = mic_y + mic_height + size // 20
    draw.arc([mic_x - mic_width//2, base_y, mic_x + mic_width + mic_width//2, base_y + mic_height//2],
             start=0, end=180, fill=(255, 255, 255, 255), width=size//60)
    
    # 麦克风支架
    stand_x = size // 2
    stand_y1 = base_y + mic_height//4
    stand_y2 = stand_y1 + size // 15
    draw.line([stand_x, stand_y1, stand_x, stand_y2], 
              fill=(255, 255, 255, 255), width=size//60)
    
    # 底座
    base_width = mic_width // 2
    draw.line([stand_x - base_width, stand_y2, stand_x + base_width, stand_y2],
              fill=(255, 255, 255, 255), width=size//60)
    
    # 声波线条
    wave_y = size // 2
    wave_spacing = size // 15
    
    # 左侧声波
    for i in range(2):
        x = mic_x - wave_spacing * (i + 1)
        y1 = wave_y - wave_spacing * (i + 1) // 2
        y2 = wave_y + wave_spacing * (i + 1) // 2
        draw.arc([x - wave_spacing//2, y1, x + wave_spacing//2, y2],
                 start=270, end=90, fill=(255, 255, 255, 200), width=size//80)
    
    # 右侧声波
    for i in range(2):
        x = mic_x + mic_width + wave_spacing * (i + 1)
        y1 = wave_y - wave_spacing * (i + 1) // 2
        y2 = wave_y + wave_spacing * (i + 1) // 2
        draw.arc([x - wave_spacing//2, y1, x + wave_spacing//2, y2],
                 start=90, end=270, fill=(255, 255, 255, 200), width=size//80)
    
    # 保存图标
    img.save(filename, 'PNG')
    print(f"Created {filename} ({size}x{size})")

def main():
    """主函数"""
    # 确保icons目录存在
    os.makedirs('icons', exist_ok=True)
    
    # 生成不同尺寸的图标
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]
    
    for size in sizes:
        filename = f'icons/icon-{size}.png'
        create_icon(size, filename)
    
    print("All icons created successfully!")

if __name__ == '__main__':
    try:
        main()
    except ImportError:
        print("Error: PIL (Pillow) is required. Install it with: pip install Pillow")
    except Exception as e:
        print(f"Error: {e}") 