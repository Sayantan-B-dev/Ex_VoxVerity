# VoxVerity Known Limitations

**Version:** 0.1.0
**Last Updated:** September 2026

---

## Model Limitations

### AASIST-L (Audio Anti-Spoofing)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| In-domain performance only | High error rate on out-of-domain data | Document evaluation scope |
| Requires 4+ seconds audio | Short utterances unreliable | Return "insufficient context" |
| Not a universal detector | Cannot detect all future attacks | Label as "signal" not "verdict" |
| English-centric training | May miss non-English spoofs | Track language evaluation status |

### ECAPA-TDNN (Speaker Embeddings)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Similarity is not identity proof | False sense of security | Clear UI disclaimers |
| Channel/noise affects accuracy | Degraded in noisy environments | Quality flags in output |
| Requires enrollment | Cannot verify without reference | Graceful "unenrolled" state |
| Domain differences | Cross-language similarity unreliable | Track evaluation per language |

---

## System Limitations

### Architecture

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Single-instance only | No horizontal scaling | Document deployment constraint |
| In-memory stores | Data lost on restart | Use database for persistence |
| No production auth | Demo only | Add auth before production |
| No rate limiting persistence | Limits reset on restart | Use Redis for production |

### Realtime Pipeline

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| 3-second chunk cadence | Not true real-time | Acceptable for demo |
| WebSocket only | No fallback transport | Document browser requirements |
| Bounded queue | Chunks dropped under load | Backpressure documented |
| CPU-bound inference | May lag on low-end machines | Degrade gracefully |

---

## Privacy Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No raw audio storage | Cannot replay for review | Evidence metadata preserved |
| Blockchain is optional | Provenance not guaranteed | Clearly documented |
| No E2E encryption | Audio visible in transit | Use HTTPS/WSS in production |
| No consent management | Demo assumes consent | Add consent UI for production |

---

## Integration Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Browser-only capture | Cannot capture phone calls | Document as WebRTC demo |
| No Twilio integration | No telephony support | Stub adapter available |
| No meeting platform SDK | No Zoom/Teams/Meet | Stub adapter available |
| No SIP/PBX | No enterprise phone | Stub adapter available |

---

## Evaluation Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Limited test data | May not represent real attacks | Expand evaluation dataset |
| No EER calculated | Cannot claim detection accuracy | Report raw scores only |
| No cross-language eval | English-only validation | Track evaluation status |
| No production metrics | Demo-only performance | Add monitoring for production |

---

## Deployment Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Free tier dependencies | May hit quotas | Document limits |
| No backup strategy | Data loss risk | Add backups for production |
| No disaster recovery | Single point of failure | Document for future |
| No CI/CD pipeline | Manual deployment | Add for production |

---

## Recommendations for Production

1. **Database:** Replace in-memory stores with PostgreSQL
2. **Auth:** Add production authentication (not demo)
3. **Scaling:** Implement horizontal scaling for AI service
4. **Monitoring:** Add comprehensive observability
5. **Backups:** Implement automated backups
6. **DR:** Plan disaster recovery procedures
7. **Security:** Complete security audit
8. **Performance:** Load test at production scale
9. **Evaluation:** Expand model evaluation datasets
10. **Documentation:** Add operational runbooks

---

## Acknowledgment

This is an SIH prototype, not a production system. The limitations above are
expected for this stage of development. Each limitation should be addressed
before production deployment.
