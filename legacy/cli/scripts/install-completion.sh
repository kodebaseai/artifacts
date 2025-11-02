#!/bin/bash
# Kodebase CLI shell completion installer
# Supports bash and zsh shells

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Detect shell
detect_shell() {
    if [ -n "$ZSH_VERSION" ]; then
        echo "zsh"
    elif [ -n "$BASH_VERSION" ]; then
        echo "bash"
    else
        # Fallback to checking SHELL variable
        case "$SHELL" in
            */zsh)
                echo "zsh"
                ;;
            */bash)
                echo "bash"
                ;;
            *)
                echo "unknown"
                ;;
        esac
    fi
}

# Check if kodebase command is available
check_kodebase() {
    if ! command -v kodebase >/dev/null 2>&1; then
        log_error "kodebase command not found in PATH"
        log_info "Make sure @kodebase/cli is installed and available in your PATH"
        exit 1
    fi
    
    if ! command -v kb >/dev/null 2>&1; then
        log_warning "kb command not found in PATH (this might be expected)"
        log_info "The kb alias should be available after @kodebase/cli is properly installed"
    fi
}

# Install bash completion
install_bash_completion() {
    local completion_dir
    local completion_file="kodebase-completion.bash"
    
    # Try different completion directories
    if [ -d "/usr/local/etc/bash_completion.d" ]; then
        completion_dir="/usr/local/etc/bash_completion.d"
    elif [ -d "/etc/bash_completion.d" ]; then
        completion_dir="/etc/bash_completion.d"
    elif [ -d "$HOME/.bash_completion.d" ]; then
        completion_dir="$HOME/.bash_completion.d"
    else
        # Create user completion directory
        completion_dir="$HOME/.bash_completion.d"
        mkdir -p "$completion_dir"
    fi
    
    log_info "Installing bash completion to $completion_dir/$completion_file"
    
    # Generate and save completion script
    cat > "$completion_dir/$completion_file" << 'EOF'
# Kodebase CLI completion for bash
_kodebase_completion() {
    local cur prev words cword
    _init_completion || return

    # Handle both 'kodebase' and 'kb' commands
    local cmd="${words[0]}"
    local line="${COMP_LINE}"
    local cursor="${COMP_POINT}"

    # Get completions from CLI
    local completions
    completions=$($cmd __complete "$line" "$cursor" 2>/dev/null)
    
    if [[ $? -eq 0 && -n "$completions" ]]; then
        COMPREPLY=($(compgen -W "$completions" -- "$cur"))
    fi
}

# Register completion for both commands
complete -F _kodebase_completion kodebase
complete -F _kodebase_completion kb
EOF

    log_success "Bash completion installed"
    
    # Check if completion will be loaded
    if [ ! -f "$HOME/.bashrc" ] || ! grep -q "bash_completion" "$HOME/.bashrc"; then
        log_warning "You may need to source bash completion in your ~/.bashrc"
        log_info "Add this line to ~/.bashrc:"
        echo "  source $completion_dir/$completion_file"
    fi
}

# Install zsh completion
install_zsh_completion() {
    local completion_dir
    local completion_file="_kodebase"
    
    # Find zsh completion directory
    if [ -n "$ZSH_VERSION" ]; then
        # Get the first directory from fpath that we can write to
        for dir in "${(@)fpath}"; do
            if [[ "$dir" == */site-functions ]] || [[ "$dir" == */.zsh ]] || [[ "$dir" == */completions ]]; then
                if [ -w "$dir" ] || [ -w "$(dirname "$dir")" ]; then
                    completion_dir="$dir"
                    break
                fi
            fi
        done
    fi
    
    # Fallback to user completion directory
    if [ -z "$completion_dir" ]; then
        completion_dir="$HOME/.zsh/completions"
        mkdir -p "$completion_dir"
        
        # Add to fpath if not already there
        if [ -f "$HOME/.zshrc" ] && ! grep -q "$completion_dir" "$HOME/.zshrc"; then
            echo "" >> "$HOME/.zshrc"
            echo "# Kodebase completion" >> "$HOME/.zshrc"
            echo "fpath=($completion_dir \$fpath)" >> "$HOME/.zshrc"
            echo "autoload -U compinit && compinit" >> "$HOME/.zshrc"
        fi
    fi
    
    log_info "Installing zsh completion to $completion_dir/$completion_file"
    
    # Generate and save completion script
    cat > "$completion_dir/$completion_file" << 'EOF'
#compdef kodebase kb

# Kodebase CLI completion for zsh
_kodebase_completion() {
    local line cursor
    line="$BUFFER"
    cursor="$CURSOR"

    # Get completions from CLI
    local completions
    completions=($(kodebase __complete "$line" "$cursor" 2>/dev/null))
    
    if [[ $? -eq 0 && ${#completions[@]} -gt 0 ]]; then
        compadd -a completions
    fi
}

# Register completion for both commands
compdef _kodebase_completion kodebase
compdef _kodebase_completion kb
EOF

    log_success "Zsh completion installed"
    log_info "Restart your shell or run 'autoload -U compinit && compinit' to enable completion"
}

# Main installation function
main() {
    echo "🚀 Kodebase CLI Shell Completion Installer"
    echo ""
    
    # Check prerequisites
    check_kodebase
    
    # Detect shell
    shell=$(detect_shell)
    log_info "Detected shell: $shell"
    
    case "$shell" in
        "bash")
            install_bash_completion
            ;;
        "zsh")
            install_zsh_completion
            ;;
        *)
            log_error "Unsupported shell: $shell"
            log_info "Supported shells: bash, zsh"
            log_info "You can manually install completion by running:"
            echo "  kodebase __complete-bash > ~/.kodebase-completion.bash"
            echo "  kodebase __complete-zsh > ~/.kodebase-completion.zsh"
            echo "Then source the appropriate file in your shell config"
            exit 1
            ;;
    esac
    
    echo ""
    log_success "Installation complete!"
    log_info "Restart your shell or source your shell config to enable completion"
    echo ""
    echo "Test completion by typing:"
    echo "  kodebase <TAB>"
    echo "  kb s <TAB>"
}

# Run main function
main "$@"