#!/usr/bin/env python3
"""
start_configurator.py

This script starts the LocalAI UI configurator webapp and automatically opens it in the browser.
It handles both the backend and frontend services, with proper error handling and logging.
"""

import os
import sys
import subprocess
import time
import webbrowser
import platform
import signal
import threading
from pathlib import Path

# Configuration
BACKEND_PORT = 3001
FRONTEND_PORT = 3000
BACKEND_HOST = '0.0.0.0'
FRONTEND_HOST = '0.0.0.0'
WAIT_TIMEOUT = 30  # seconds to wait for services to start

def print_banner():
    """Print a welcome banner."""
    print("=" * 60)
    print("🚀 LocalAI UI Configurator")
    print("=" * 60)
    print("Starting webapp for easy Docker Compose configuration...")
    print(f"Backend will run on: http://localhost:{BACKEND_PORT}")
    print(f"Frontend will run on: http://localhost:{FRONTEND_PORT}")
    print("=" * 60)

def check_dependencies():
    """Check if required dependencies are available."""
    print("📋 Checking dependencies...")
    
    # Check if we're in the right directory
    if not os.path.exists('package.json'):
        print("❌ Error: package.json not found. Please run this script from the localai-ui directory.")
        return False
    
    # Check if node_modules exists
    if not os.path.exists('node_modules'):
        print("📦 Installing frontend dependencies...")
        try:
            subprocess.run(['npm', 'install'], check=True, cwd='.')
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"❌ Error installing frontend dependencies: {e}")
            print("💡 Please ensure Node.js and npm are installed and try again.")
            return False
    
    # Check backend dependencies
    backend_path = Path('backend')
    if not (backend_path / 'node_modules').exists():
        print("📦 Installing backend dependencies...")
        try:
            subprocess.run(['npm', 'install'], check=True, cwd=str(backend_path))
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"❌ Error installing backend dependencies: {e}")
            print("💡 Please ensure Node.js and npm are installed and try again.")
            return False
    
    print("✅ Dependencies check completed")
    return True

def ensure_directories():
    """Ensure required directories exist."""
    print("📁 Setting up directories...")
    
    directories = [
        'input',
        'output', 
        '../shared'  # Parent shared directory for custom_services.json
    ]
    
    for directory in directories:
        dir_path = Path(directory)
        if not dir_path.exists():
            print(f"📁 Creating directory: {directory}")
            dir_path.mkdir(parents=True, exist_ok=True)
    
    # Copy default files if they don't exist
    input_compose = Path('input/docker-compose.yml')
    if not input_compose.exists():
        # Check if there's a template in the parent directory
        parent_compose = Path('../docker-compose.yml')
        if parent_compose.exists():
            print("📋 Copying docker-compose.yml template to input directory...")
            import shutil
            shutil.copy2(str(parent_compose), str(input_compose))
        else:
            print("⚠️  Warning: No docker-compose.yml found in input directory")
    
    # Create default env file if it doesn't exist
    input_env = Path('input/env')
    if not input_env.exists():
        parent_env = Path('../.env')
        if parent_env.exists():
            print("📋 Copying .env template to input directory...")
            import shutil
            shutil.copy2(str(parent_env), str(input_env))
    
    print("✅ Directory setup completed")

def wait_for_service(url, service_name, timeout=30):
    """Wait for a service to become available."""
    print(f"⏳ Waiting for {service_name} to start...")
    
    import urllib.request
    import urllib.error
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            urllib.request.urlopen(url, timeout=2)
            print(f"✅ {service_name} is ready!")
            return True
        except (urllib.error.URLError, ConnectionError):
            time.sleep(1)
    
    print(f"❌ {service_name} failed to start within {timeout} seconds")
    return False

def start_backend():
    """Start the backend server."""
    print("🔧 Starting backend server...")
    
    backend_path = Path('backend')
    env = os.environ.copy()
    env['PORT'] = str(BACKEND_PORT)
    
    try:
        process = subprocess.Popen(
            ['node', 'server.js'],
            cwd=str(backend_path),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Start a thread to handle backend output
        def log_backend_output():
            for line in process.stdout:
                print(f"[BACKEND] {line.strip()}")
        
        threading.Thread(target=log_backend_output, daemon=True).start()
        
        return process
    except FileNotFoundError:
        print("❌ Error: Node.js not found. Please install Node.js and try again.")
        return None
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        return None

def start_frontend():
    """Start the frontend development server."""
    print("🎨 Starting frontend server...")
    
    env = os.environ.copy()
    env['VITE_API_URL'] = f'http://localhost:{BACKEND_PORT}'
    
    try:
        process = subprocess.Popen(
            ['npm', 'run', 'dev', '--', '--host', FRONTEND_HOST, '--port', str(FRONTEND_PORT)],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Start a thread to handle frontend output
        def log_frontend_output():
            for line in process.stdout:
                line = line.strip()
                if line:
                    print(f"[FRONTEND] {line}")
        
        threading.Thread(target=log_frontend_output, daemon=True).start()
        
        return process
    except FileNotFoundError:
        print("❌ Error: npm not found. Please install Node.js and npm and try again.")
        return None
    except Exception as e:
        print(f"❌ Error starting frontend: {e}")
        return None

def open_browser():
    """Open the configurator in the default web browser."""
    url = f"http://localhost:{FRONTEND_PORT}"
    print(f"🌐 Opening browser to {url}")
    
    try:
        webbrowser.open(url)
        print("✅ Browser opened successfully")
    except Exception as e:
        print(f"⚠️  Could not open browser automatically: {e}")
        print(f"💡 Please manually open your browser and navigate to: {url}")

def cleanup_processes(backend_process, frontend_process):
    """Clean up running processes."""
    print("\n🧹 Cleaning up processes...")
    
    processes = [
        (backend_process, "Backend"),
        (frontend_process, "Frontend")
    ]
    
    for process, name in processes:
        if process and process.poll() is None:
            print(f"🛑 Stopping {name} server...")
            try:
                process.terminate()
                process.wait(timeout=5)
                print(f"✅ {name} server stopped")
            except subprocess.TimeoutExpired:
                print(f"⚠️  Force killing {name} server...")
                process.kill()
                process.wait()
            except Exception as e:
                print(f"❌ Error stopping {name} server: {e}")

def handle_interrupt(backend_process, frontend_process):
    """Handle Ctrl+C interrupt."""
    def signal_handler(sig, frame):
        print("\n\n🛑 Interrupt received, shutting down...")
        cleanup_processes(backend_process, frontend_process)
        print("👋 Goodbye!")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    if platform.system() != 'Windows':
        signal.signal(signal.SIGTERM, signal_handler)

def main():
    """Main function to start the configurator."""
    # Handle help flag
    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help', 'help']:
        print("LocalAI UI Configurator Start Script")
        print("")
        print("Usage: python start_configurator.py")
        print("")
        print("This script starts the LocalAI UI configurator webapp and automatically")
        print("opens it in your browser. It handles dependency installation, directory")
        print("setup, and launches both backend and frontend services.")
        print("")
        print("Features:")
        print("  - Automatic dependency installation")
        print("  - Directory setup and template copying")
        print("  - Backend API server (port 3001)")
        print("  - Frontend development server (port 3000)")
        print("  - Automatic browser opening")
        print("  - Graceful shutdown with Ctrl+C")
        print("")
        print("Requirements:")
        print("  - Node.js (v16 or higher)")
        print("  - npm")
        print("  - Python 3")
        print("")
        print("Press Ctrl+C to stop all services when running.")
        return
    
    print_banner()
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Setup directories
    ensure_directories()
    
    # Start backend
    backend_process = start_backend()
    if not backend_process:
        sys.exit(1)
    
    # Wait for backend to be ready
    backend_url = f"http://localhost:{BACKEND_PORT}/api/status"
    if not wait_for_service(backend_url, "Backend", WAIT_TIMEOUT):
        cleanup_processes(backend_process, None)
        sys.exit(1)
    
    # Start frontend
    frontend_process = start_frontend()
    if not frontend_process:
        cleanup_processes(backend_process, None)
        sys.exit(1)
    
    # Wait for frontend to be ready
    frontend_url = f"http://localhost:{FRONTEND_PORT}"
    if not wait_for_service(frontend_url, "Frontend", WAIT_TIMEOUT):
        cleanup_processes(backend_process, frontend_process)
        sys.exit(1)
    
    # Open browser
    time.sleep(2)  # Give services a moment to fully initialize
    open_browser()
    
    # Setup interrupt handling
    handle_interrupt(backend_process, frontend_process)
    
    print("\n" + "=" * 60)
    print("🎉 LocalAI UI Configurator is now running!")
    print(f"🌐 Access the webapp at: http://localhost:{FRONTEND_PORT}")
    print(f"🔧 Backend API at: http://localhost:{BACKEND_PORT}")
    print("👆 Press Ctrl+C to stop all services")
    print("=" * 60)
    
    # Keep the script running
    try:
        while True:
            # Check if processes are still running
            if backend_process.poll() is not None:
                print("❌ Backend process has stopped unexpectedly")
                break
            if frontend_process.poll() is not None:
                print("❌ Frontend process has stopped unexpectedly")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        cleanup_processes(backend_process, frontend_process)

if __name__ == "__main__":
    main()