# 🔐 Security Policy

This document outlines the security model, access policies, and best practices for the `rsazure-openai-toolkit` project.
___

## 👤 Maintainer Control & Branch Protection

This repository is maintained solely by the project owner.

- Direct pushes to any branch are restricted
- Only the maintainer can merge changes
- All releases are manually reviewed and published

This guarantees that all published code is intentional, verifiable, and secure.
___

## ✅ Security Best Practices

While this project does not handle user credentials or sensitive data directly, it is recommended that:

- You never expose API keys in source code
- Environment variables are used to manage secrets
- You follow the [principle of least privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege) when configuring Azure OpenAI
___

## 📣 Reporting a Vulnerability

If you discover a potential security issue in this project, please **report it responsibly**:

- Open a [GitHub Issue](https://github.com/renan-siqueira/rsazure-openai-toolkit/issues), or  
- Email directly: [renan.siqu@gmail.com](mailto:renan.siqu@gmail.com)

You will receive a response as soon as possible. Please **avoid disclosing vulnerabilities publicly** before they are resolved.
___

## 🔒 Security Notes

- This toolkit **does not collect or send any data externally**.
- All logic is executed **locally** and transparently — feel free to audit the code.
- No telemetry, analytics, or external logging mechanisms are used.
___

## 🤝 Responsible Use

This project is open source and shared in the spirit of collaboration.
Please use it ethically and contribute improvements or fixes whenever possible.

Thank you for helping keep the open source ecosystem safe!
