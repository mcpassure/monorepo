@echo off
setlocal

REM ============================================================
REM  Claude Code — modo autonomo para esta pasta de projeto
REM  Uso somente em pasta de projeto CONFIAVEL.
REM
REM  Modos:
REM    roda_claude.bat                -> abre o Claude Code (modo chat)
REM    roda_claude.bat /run-all       -> executa o fluxo completo autonomo
REM    roda_claude.bat /05-implement  -> retoma implementacao com artefatos + loop
REM    roda_claude.bat /06-validation -> revalida e dispara correcoes se preciso
REM ============================================================

REM Captura nome da pasta atual e define title da janela CMD
for %%i in ("%CD%") do set "FOLDER_NAME=%%~nxi"
title MCPAssure - %FOLDER_NAME%

REM Garante que a pasta artifacts exista antes de qualquer coisa
if not exist "artifacts" mkdir "artifacts"

REM Sem argumentos -> abre Claude Code interativo (ainda com permissoes abertas)
if "%~1"=="" (
    claude --dangerously-skip-permissions
    goto :end
)

REM Com argumentos -> passa direto para o Claude Code como comando
claude --dangerously-skip-permissions "%*"

:end
endlocal
