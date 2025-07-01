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
4. [機能概要](#4-機能概要)
5. [技術スタック](#5-技術スタック)
6. [データ構造](#6-データ構造)
7. [実装状況](#7-実装状況)
8. [API仕様](#8-api仕様)
9. [開発指示](#9-開発指示)
10. [ユーザー向けドキュメント](#10-ユーザー向けドキュメント)

-----

## 1 プロジェクト開発ガイドライン

@include claude-includes/development-guidelines.md

-----

## 2 プロジェクト概要と機能

@include claude-includes/project-overview.md

-----

## 3 初回セットアップ手順

基本セットアップは `/docs/README.md` および `/docs/configuration.md` を参照

-----

## 4 機能概要

@include claude-includes/functionality.md

-----

## 5 技術スタック

@include claude-includes/architecture.md

-----

## 6 データ構造

@include claude-includes/data-structure-dev.md

-----

## 7 実装状況

@include claude-includes/implementation-summary.md

-----

## 8 API仕様

@include claude-includes/api-endpoints-dev.md

-----

## 9 開発指示

@include claude-includes/claude-instructions.md

-----

## 10 ユーザー向けドキュメント

詳細なユーザー向け仕様書は `/docs/` フォルダに分離:
- `docs/README.md` - プロジェクト概要・セットアップ
- `docs/user-guide.md` - 操作マニュアル
- `docs/api-reference.md` - ユーザー向けAPI仕様