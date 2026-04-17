{
  description = "Nix flake template for Python";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  inputs.systems.url = "github:nix-systems/default";
  inputs.flake-utils = {
    url = "github:numtide/flake-utils";
    inputs.systems.follows = "systems";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};
        python = pkgs.python313;
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            black
            prettier
            eslint
            shfmt
						openshift
            # mongosh
            # (python.withPackages (python-pkgs: [
            #   python-pkgs.requests
            # ]))
          ];
          # maybe?
          # shellHook = ''
          # 	export PIP_PREFIX=$(pwd)/_build/pip_packages #Dir where built packages are stored
          # 	export PYTHONPATH="$PIP_PREFIX/${pkgs.python3.sitePackages}:$PYTHONPATH"
          # 	export PATH="$PIP_PREFIX/bin:$PATH"
          # 	unset SOURCE_DATE_EPOCH
          # '';
        };
      }
    );
}
