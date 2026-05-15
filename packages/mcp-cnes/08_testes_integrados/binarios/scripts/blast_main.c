/*
 * blast-dbc  —  Conversor DBC → CSV para arquivos DATASUS
 * Uso:  blast entrada.dbc saida.csv
 *       blast --version | -v
 *
 * Formato DBC (DATASUS):
 *   bytes 0-3  : uint32 LE = tamanho do DBF descomprimido
 *   bytes 4+   : PKWARE DCL implode (implementado em blast.c do zlib/contrib)
 *
 * Após descompressão → arquivo DBF padrão (dBase III / IV).
 *
 * Compilação:
 *   gcc -O2 -o blast blast_main.c blast.c
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "blast.h"

/* ── Callbacks para o blast ────────────────────────────────────── */

typedef struct { const uint8_t *buf; size_t pos, len; } InCtx;
typedef struct { uint8_t *buf; size_t pos, cap; } OutCtx;

static unsigned dbc_in(void *how, unsigned char **buf) {
    InCtx *c = (InCtx *)how;
    if (c->pos >= c->len) return 0;
    size_t n = c->len - c->pos;
    if (n > 4096) n = 4096;
    *buf = (unsigned char *)(c->buf + c->pos);
    c->pos += n;
    return (unsigned)n;
}

static int dbc_out(void *how, unsigned char *buf, unsigned len) {
    OutCtx *c = (OutCtx *)how;
    if (c->pos + len > c->cap) {
        c->cap = (c->pos + len) * 2 + 65536;
        uint8_t *tmp = (uint8_t *)realloc(c->buf, c->cap);
        if (!tmp) return 1;
        c->buf = tmp;
    }
    memcpy(c->buf + c->pos, buf, len);
    c->pos += len;
    return 0;
}

/* ── Leitura little-endian ─────────────────────────────────────── */

static uint32_t u32le(const uint8_t *p) {
    return (uint32_t)p[0] | ((uint32_t)p[1]<<8) |
           ((uint32_t)p[2]<<16) | ((uint32_t)p[3]<<24);
}
static uint16_t u16le(const uint8_t *p) {
    return (uint16_t)p[0] | ((uint16_t)p[1]<<8);
}

/* ── Escrita de campo CSV (escape de aspas e vírgulas) ─────────── */

static void csv_field(FILE *out, const char *s, int len) {
    while (len > 0 && s[len-1] == ' ') len--;
    int q = 0;
    for (int i = 0; i < len; i++)
        if (s[i]==','||s[i]=='"'||s[i]=='\n'||s[i]=='\r') { q=1; break; }
    if (q) {
        fputc('"', out);
        for (int i=0;i<len;i++) { if(s[i]=='"') fputc('"',out); fputc(s[i],out); }
        fputc('"', out);
    } else {
        fwrite(s, 1, len, out);
    }
}

/* ── Main ──────────────────────────────────────────────────────── */

int main(int argc, char **argv) {
    /* Suporte a --version / -v (usado por blastDisponivel() no MCP) */
    if (argc >= 2 && (!strcmp(argv[1],"--version") || !strcmp(argv[1],"-v"))) {
        puts("blast 1.0.0 (datasus-dbc + zlib/contrib blast, public domain)");
        return 0;
    }
    if (argc < 3) {
        fprintf(stderr, "Uso: blast entrada.dbc saida.csv\n");
        return 1;
    }

    /* ── Ler arquivo DBC ───────────────────────────────────────── */
    FILE *f = fopen(argv[1], "rb");
    if (!f) { perror(argv[1]); return 1; }
    fseek(f, 0, SEEK_END);
    long fsz = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (fsz < 4) { fprintf(stderr,"Arquivo muito pequeno: %s\n",argv[1]); fclose(f); return 1; }

    uint8_t *raw = (uint8_t *)malloc((size_t)fsz);
    if (!raw || (long)fread(raw, 1, (size_t)fsz, f) != fsz) {
        perror("fread"); fclose(f); free(raw); return 1;
    }
    fclose(f);

    /* Primeiros 4 bytes = tamanho descomprimido (uint32 LE) */
    uint32_t decomp_sz = u32le(raw);
    if (decomp_sz == 0 || decomp_sz > 500*1024*1024) {
        fprintf(stderr,"Cabeçalho DBC inválido (decomp_sz=%u)\n", decomp_sz);
        free(raw); return 1;
    }

    /* ── Descomprimir ──────────────────────────────────────────── */
    InCtx  in_ctx  = { raw + 4, 0, (size_t)(fsz - 4) };
    OutCtx out_ctx = { NULL, 0, 0 };
    out_ctx.buf = (uint8_t *)malloc(decomp_sz + 65536);
    out_ctx.cap = decomp_sz + 65536;
    if (!out_ctx.buf) { free(raw); return 1; }

    int rc = blast(dbc_in, &in_ctx, dbc_out, &out_ctx);
    free(raw);
    if (rc != 0) {
        fprintf(stderr, "[blast] erro de descompressão: código %d\n", rc);
        free(out_ctx.buf); return 1;
    }

    uint8_t *dbf  = out_ctx.buf;
    size_t   dbfsz = out_ctx.pos;

    /* ── Parsear cabeçalho DBF ─────────────────────────────────── */
    if (dbfsz < 32) {
        fprintf(stderr,"DBF descomprimido muito pequeno (%zu bytes)\n", dbfsz);
        free(dbf); return 1;
    }

    uint32_t nrec  = u32le(dbf + 4);
    uint16_t hdrsz = u16le(dbf + 8);
    uint16_t recsz = u16le(dbf + 10);

    /* Campos: offset 32, cada campo 32 bytes, terminado por 0x0D */
    typedef struct { char name[12]; char type; int len; } Field;
    Field flds[512];
    int nflds = 0;
    int off = 32;
    while (off + 32 <= (int)hdrsz && off + 32 <= (int)dbfsz &&
           dbf[off] != 0x0D && nflds < 512) {
        memcpy(flds[nflds].name, dbf + off, 11);
        flds[nflds].name[11] = '\0';
        flds[nflds].type     = (char)dbf[off + 11];
        flds[nflds].len      = (int)dbf[off + 16];
        nflds++;
        off += 32;
    }

    /* ── Escrever CSV ──────────────────────────────────────────── */
    FILE *csv = fopen(argv[2], "w");
    if (!csv) { perror(argv[2]); free(dbf); return 1; }

    /* Linha de cabeçalho */
    for (int i = 0; i < nflds; i++) {
        if (i) fputc(',', csv);
        fputs(flds[i].name, csv);
    }
    fputc('\n', csv);

    /* Registros */
    uint32_t written = 0;
    if (hdrsz < dbfsz) {
        uint8_t *rec = dbf + hdrsz;
        uint8_t *end = dbf + dbfsz;
        for (uint32_t r = 0; r < nrec && rec + recsz <= end; r++, rec += recsz) {
            if (*rec == 0x2A) continue;  /* registro deletado */
            uint8_t *fp = rec + 1;
            for (int i = 0; i < nflds; i++) {
                if (i) fputc(',', csv);
                csv_field(csv, (char *)fp, flds[i].len);
                fp += flds[i].len;
            }
            fputc('\n', csv);
            written++;
        }
    }

    fclose(csv);
    free(dbf);
    fprintf(stderr, "[blast] convertido: %u registros\n", written);
    return 0;
}
