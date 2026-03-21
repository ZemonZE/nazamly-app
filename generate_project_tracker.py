#!/usr/bin/env python3
"""
Nazamly Project Tracker Generator
Generates an Excel file with Backlog and Task Tracking sheets
"""

import pandas as pd
from datetime import datetime, timedelta

# Define project sprints with tasks
sprints = {
    "Sprint 1: Foundation & Authentication": {
        "week": 1,
        "tasks": [
            "Firebase project initialization with Google OAuth provider configuration",
            "Backend server setup with Express 5 and MongoDB connection",
            "User model implementation with Firebase UID integration",
            "Authentication middleware with Firebase token verification",
            "Auth sync endpoint for Firebase-to-MongoDB user synchronization",
            "React web app with glassmorphism dark-green UI design",
            "Login and registration pages for web platform",
            "React Native mobile app initialization with Expo Router",
            "Mobile authentication screens (Login/Register) with Google OAuth support",
            "Firebase Auth integration across all platforms"
        ],
        "deliverables": "Complete authentication system across all platforms (Web, Mobile, Admin)"
    },
    "Sprint 2: Core Academic Features": {
        "week": 2,
        "tasks": [
            "Material Hub implementation with Google Drive integration",
            "Materials folder and file management system",
            "Course materials organization with subfolder structure",
            "GPA Calculator with term GPA and cumulative GPA computation",
            "GPA Planner with target strategy algorithm",
            "Smart study plan generation based on course difficulty",
            "Timetable generator with AI-powered schedule parsing",
            "Schedule management API with conflict detection",
            "Frontend pages for Materials, GPA Calculator, and GPA Planner",
            "Mobile timetable view with weekly schedule display"
        ],
        "deliverables": "Material Hub, GPA Calculator, GPA Planner, and Timetable Generator fully functional"
    },
    "Sprint 3: Security & Platform Integration": {
        "week": 3,
        "tasks": [
            "Custom admin claims implementation in Firebase",
            "Role-based access control (admin vs student)",
            "User access status management (active, pending, blocked)",
            "Admin dashboard UI with user management interface",
            "Course and doctor CRUD operations for admins",
            "Course instance management system",
            "API security improvements across all endpoints",
            "Mobile app API integration with backend services",
            "Authentication flow improvements on mobile",
            "Cross-platform data synchronization"
        ],
        "deliverables": "Secure admin dashboard with full user management and role-based access control"
    },
    "Sprint 4: AI Question Generation & Quiz System": {
        "week": 4,
        "tasks": [
            "AI-powered question generation system with multiple question types",
            "MCQ (Multiple Choice Questions) generation with automatic answer options",
            "True/False question generation",
            "Short answer question generation",
            "Essay question generation with grading rubrics",
            "Question difficulty level assignment (Easy, Medium, Hard)",
            "Chapter-based question organization and filtering",
            "Student interface for generating custom practice questions",
            "Question bank management and storage",
            "AI integration with Google Generative AI and OpenAI",
            "Question editing and refinement capabilities",
            "Export and sharing functionality for generated questions"
        ],
        "deliverables": "Complete AI question generation system with MCQ, T/F, Short Answer, and Essay support"
    },
    "Sprint 5: Polish, Security & Production Readiness": {
        "week": 5,
        "tasks": [
            "Comprehensive security audit and hardening",
            "Production-ready authentication middleware (disabled test mode)",
            "Input validation with Joi schemas",
            "Error handling improvements across all controllers",
            "CORS configuration with environment-based origins",
            "Rate limiting for AI endpoints",
            "Database query optimization and indexing",
            "Admin dashboard completion with all CRUD operations",
            "User management with role and status controls",
            "Final UI/UX polish across all platforms",
            "Documentation and deployment preparation"
        ],
        "deliverables": "Production-ready application with complete security, optimization, and documentation"
    }
}

# Team members (you can modify this list)
team_members = [
    "Waleed",
    "Hazem", 
    "Abdo",
    "Youssef",
    "Amr",
    "Mustafa Eid",
    "Mohamed Walid",
    "Abdelrahman Osama"
]

def generate_backlog_sheet():
    """Generate the Backlog sheet with all tasks categorized by sprint"""
    backlog_data = []
    
    for sprint_name, sprint_data in sprints.items():
        week = sprint_data["week"]
        deliverables = sprint_data["deliverables"]
        
        for idx, task in enumerate(sprint_data["tasks"], 1):
            backlog_data.append({
                "Sprint": sprint_name,
                "Week": f"Week {week}",
                "Task ID": f"W{week}-T{idx}",
                "Task Name": task,
                "Deliverables": deliverables if idx == 1 else ""
            })
    
    return pd.DataFrame(backlog_data)

def generate_task_tracking_sheet():
    """Generate the Task Tracking sheet for daily monitoring"""
    tracking_data = []
    
    # Start date (you can modify this)
    start_date = datetime.now()
    
    for sprint_name, sprint_data in sprints.items():
        week = sprint_data["week"]
        week_start = start_date + timedelta(weeks=week-1)
        week_end = week_start + timedelta(days=6)
        
        for idx, task in enumerate(sprint_data["tasks"], 1):
            tracking_data.append({
                "Task ID": f"W{week}-T{idx}",
                "Task Name": task,
                "Sprint": sprint_name,
                "Week": f"Week {week}",
                "Status": "To Do",
                "Assignee": "",
                "Start Date": week_start.strftime("%Y-%m-%d"),
                "End Date": week_end.strftime("%Y-%m-%d"),
                "Priority": "High" if week <= 2 else "Medium",
                "Notes": ""
            })
    
    return pd.DataFrame(tracking_data)

def main():
    """Main function to generate the Excel file"""
    print("🚀 Generating Nazamly Project Tracker...")
    
    # Generate both sheets
    backlog_df = generate_backlog_sheet()
    tracking_df = generate_task_tracking_sheet()
    
    # Create Excel writer
    output_file = "Nazamly_Project_Tracker.xlsx"
    
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        # Write Backlog sheet
        backlog_df.to_excel(writer, sheet_name='Backlog', index=False)
        
        # Write Task Tracking sheet
        tracking_df.to_excel(writer, sheet_name='Task Tracking', index=False)
        
        # Get workbook and sheets for formatting
        workbook = writer.book
        backlog_sheet = writer.sheets['Backlog']
        tracking_sheet = writer.sheets['Task Tracking']
        
        # Auto-adjust column widths for Backlog
        for column in backlog_sheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 60)
            backlog_sheet.column_dimensions[column_letter].width = adjusted_width
        
        # Auto-adjust column widths for Task Tracking
        for column in tracking_sheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            tracking_sheet.column_dimensions[column_letter].width = adjusted_width
    
    print(f"✅ Excel file generated successfully: {output_file}")
    print(f"📊 Total tasks: {len(tracking_df)}")
    print(f"📅 Sprints: {len(sprints)}")
    print("\n📋 Summary:")
    for sprint_name, sprint_data in sprints.items():
        print(f"  • {sprint_name}: {len(sprint_data['tasks'])} tasks")

if __name__ == "__main__":
    try:
        main()
    except ImportError:
        print("❌ Error: Required libraries not found.")
        print("📦 Please install required packages:")
        print("   pip install pandas openpyxl")
    except Exception as e:
        print(f"❌ Error: {e}")
