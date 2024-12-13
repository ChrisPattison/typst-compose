{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = inputs:
    inputs.flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = (import (inputs.nixpkgs) { inherit system; });
      in {
        devShell = pkgs.mkShell {
          buildInputs=[
            pkgs.nodejs
            pkgs.pandoc
            pkgs.nodePackages.pnpm
            pkgs.nodePackages.typescript
            pkgs.nodePackages.typescript-language-server
          ];
        };
        packages = rec {
          typst-compose-backend-srcs = ./backend;
            
          typst-compose-backend = pkgs.writeShellApplication {
            name = "typst-compose-backend";
            runtimeInputs = [
              pkgs.nodejs
              pkgs.pandoc
            ];
            text = ''
              node ${typst-compose-backend-srcs}/server.js
            '';
          };

          default = typst-compose-backend;
        };
      }
    );
}
