# GitHub's runners build ggml with -march=native by default. That emits AVX-512/AMX
# instructions which crash with 0xc000001d on older CPUs (e.g. the Skylake i7-6600U).
# Keep the build portable: AVX/AVX2 stay available, AVX-512 does not.
set(GGML_NATIVE OFF CACHE BOOL "ggml: optimize for the current system" FORCE)
set(GGML_AVX512 OFF CACHE BOOL "ggml: enable AVX512F" FORCE)
set(GGML_AVX512_VBMI OFF CACHE BOOL "ggml: enable AVX512-VBMI" FORCE)
set(GGML_AVX512_VNNI OFF CACHE BOOL "ggml: enable AVX512-VNNI" FORCE)
set(GGML_AVX512_BF16 OFF CACHE BOOL "ggml: enable AVX512-BF16" FORCE)
