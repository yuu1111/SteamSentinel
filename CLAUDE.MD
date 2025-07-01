# SteamSentinel - Steam価格監視システム 仕様書

## 概要

SteamSentinelは、Steamゲームの価格を監視し、セール時の最安値更新や無料配布を検知してWebサイトとDiscordで通知する包括的な価格監視・財務管理システムです。

**核心機能:**
- **価格監視**: リアルタイム価格追跡、歴史的最安値検知、セール通知
- **無料ゲーム検知**: Epic Games & Steam無料ゲーム自動検知・通知・管理
- **出費追跡**: ROI分析、予算管理、支出パターン分析
- **ダッシュボード**: カスタマイズ可能な統合ダッシュボード
- **レポート生成**: PDF/CSV/JSON形式での包括的レポート
- **Discord通知**: リッチ埋め込み形式での即時通知

## 目次

1. [プロジェクト開発ガイドライン](#1-プロジェクト開発ガイドライン)
2. [プロジェクト概要と機能](#2-プロジェクト概要と機能)
3. [初回セットアップ手順](#3-初回セットアップ手順)
4. [Webサイト機能とユーザビリティ](#4-webサイト機能とユーザビリティ)
5. [出費追跡・予算管理システム](#5-出費追跡予算管理システム)
6. [技術要件](#6-技術要件)
7. [データ構造](#7-データ構造)
8. [使用技術スタックとアーキテクチャ](#8-使用技術スタックとアーキテクチャ)
9. [開発フェーズ - 実装状況](#9-開発フェーズ---実装状況)
10. [API エンドポイント仕様](#10-api-エンドポイント仕様)
11. [Claude Code 実装指示](#11-claude-code-実装指示)

-----

## 1 プロジェクト開発ガイドライン

@include claude-includes/development-guidelines.md

-----

## 2 プロジェクト概要と機能

@include claude-includes/project-overview.md

-----

## 3 初回セットアップ手順

@include claude-includes/setup-requirements.md

-----

## 4 Webサイト機能とユーザビリティ

@include claude-includes/functionality.md

-----

## 5 出費追跡・予算管理システム

@include claude-includes/expense-tracking-system.md

-----

## 6 技術要件

@include claude-includes/technical-specs.md

-----

## 7 データ構造

@include claude-includes/data-structure.md

-----

## 8 使用技術スタックとアーキテクチャ

@include claude-includes/architecture.md

-----

## 9 開発フェーズ - 実装状況

@include claude-includes/implementation-status.md

-----

## 10 API エンドポイント仕様

@include claude-includes/api-endpoints.md

-----

## 11 Claude Code 実装指示

@include claude-includes/claude-instructions.md