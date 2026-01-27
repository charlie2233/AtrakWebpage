import re
import json
from pathlib import Path

def parse_weekly_log(file_path):
    content = Path(file_path).read_text(encoding='utf-8')
    
    # Split by separator
    raw_weeks = re.split(r'\n---\n', content)
    
    weeks_data = []
    
    for raw in raw_weeks:
        if not raw.strip():
            continue
            
        # Parse Title / Date
        title_match = re.search(r'## Week of (.+)', raw)
        if not title_match:
            continue
            
        date_range = title_match.group(1).strip()
        
        # Parse Quote/Theme
        theme_match = re.search(r'### [“"](.+)[”"]', raw)
        theme = theme_match.group(1) if theme_match else "Weekly Update"
        
        # Parse Sections
        sections = {}
        current_section = None
        
        for line in raw.split('\n'):
            line = line.strip()
            if line.startswith('**') and line.endswith('**'):
                current_section = line.strip('*').lower()
                sections[current_section] = []
            elif line.startswith('* ') and current_section:
                item = line[2:].strip()
                sections[current_section].append(item)
                
        # Construct JSON object
        week_obj = {
            "dateRange": date_range,
            "title": theme,
            "highlights": sections.get('highlights', []),
            "shipped": sections.get('shipped', []),
            "engineering": sections.get('engineering', []),
            "fixes": sections.get('fixes', []),
            "metrics": sections.get('metrics', []),
            "next": sections.get('next', [])
        }
        
        weeks_data.append(week_obj)
        
    return weeks_data

# Run parser
try:
    data = parse_weekly_log('/Users/hanfei/LunarWeb/WeeklyLog.txt')
    output_path = '/Users/hanfei/LunarWeb/data/weekly-history.json'
    Path(output_path).write_text(json.dumps(data, indent=2), encoding='utf-8')
    print(f"Successfully parsed {len(data)} weeks to {output_path}")
except Exception as e:
    print(f"Error: {e}")

