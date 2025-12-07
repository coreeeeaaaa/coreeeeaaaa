package g6

default allow = false

# 실제 검증 로직
allow {
  # SBOM 파일 존재 확인
  count(input.sbom.components) > 0
  
  # 서명 실제 존재 (빈 문자열 아님)
  input.signature.digest != ""
  count(input.signature.digest) > 10
  
  # 서명 알고리즘 검증
  input.signature.algorithm in ["sha256", "sha512"]
}

deny[msg] {
  count(input.sbom.components) == 0
  msg := "G6 failed: SBOM components missing"
}

deny[msg] {
  input.signature.digest == ""
  msg := "G6 failed: signature digest empty"
}