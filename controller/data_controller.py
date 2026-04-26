from datetime import datetime
from flask import Blueprint, request
from sqlalchemy import func, or_, exists
from sqlalchemy.exc import IntegrityError
from exts import db
from models import *
from service.utils import ok, fail, jwt_required, paginate_query, model_to_dict, export_rows, apply_like

bp = Blueprint('data', __name__, url_prefix='/api')

ROLE_ADMIN = 'admin'
ROLE_USER = 'user'

MODEL_MAP = {
    'users': (UserInfo, ['username', 'role', 'status'], 'user_id'),
    'proteins': (Protein, ['uniprot_accession', 'gene_name', 'protein_name', 'species_name'], 'protein_id'),
    'kinases': (Kinase, ['entry_name', 'organism_name'], 'protein_id'),
    'condensates': (Condensate, ['condensate_uid', 'condensate_name', 'condensate_type'], 'condensate_id'),
    'diseases': (Disease, ['disease_name'], 'disease_id'),
    'cmods': (Cmod, ['cmod_name', 'biomolecular_type', 'phenotypic_class'], 'cmod_id'),
    'publications': (Publication, ['pmid'], 'pmid'),
}
AUTO_PK = {'users', 'proteins', 'condensates', 'diseases', 'cmods'}

COLUMNS = {
    'proteins': [('uniprot_accession', 'UniProt Accession'), ('gene_name', 'Gene Name'),
                 ('protein_name', 'Protein Name'), ('species_name', 'Species'),
                 ('biomolecular_condensate_count', 'Biomolecular Condensates'),
                 ('synthetic_condensate_count', 'Synthetic Condensates')],
    'kinases': [('entry_name', 'Kinase Entry'), ('uniprot_accession', 'UniProt Accession'), ('gene_name', 'Gene Name'),
                ('organism_name', 'Organism'), ('sequence_length', 'Sequence Length'), ('reviewed_flag', 'Reviewed')],
    'condensates': [('condensate_uid', 'Condensate UID'), ('condensate_name', 'Condensate Name'),
                    ('condensate_type', 'Type'), ('species_tax_id', 'Species Tax ID'),
                    ('proteins_count', 'Protein Count'), ('has_dna', 'DNA'), ('has_rna', 'RNA'),
                    ('confidence_score', 'Confidence Score')],
    'diseases': [('disease_id', 'Disease ID'), ('disease_name', 'Disease Name')],
    'cmods': [('cmod_id', 'C-mod ID'), ('cmod_name', 'Chemical Modifier'), ('biomolecular_type', 'Biomolecular Type'),
              ('phenotypic_class', 'Phenotypic Class')],
    'publications': [('pmid', 'PMID')],
    'users': [('user_id', 'User ID'), ('username', 'Username'), ('gender', 'Gender'), ('phone', 'Phone'),
              ('email', 'Email'), ('role', 'Role'), ('status', 'Status'), ('create_time', 'Created At')],
    'admin_logs': [('log_id', 'Log ID'), ('admin_user', 'Admin User'), ('action_type', 'Action'),
                   ('target_table', 'Target Table'), ('target_id', 'Target ID'), ('timestamp', 'Timestamp')],
}


def clean_data(data):
    return {k: (None if v == '' else v) for k, v in (data or {}).items()}


def write_admin_log(action_type, target_table, target_id=None):
    payload = getattr(request, 'jwt_user', {}) or {}
    admin_user = payload.get('username') or 'unknown'
    db.session.add(AdminLog(
        admin_user=admin_user,
        action_type=action_type,
        target_table=target_table,
        target_id=None if target_id is None else str(target_id),
    ))


def kinase_dict(k):
    d = model_to_dict(k)
    if k.protein:
        d.update({'uniprot_accession': k.protein.uniprot_accession, 'gene_name': k.protein.gene_name})
    return d


def _split_pmids(value):
    if not value:
        return []
    return [x.strip() for x in str(value).split('|') if x.strip()]


def _join_names(rows, key):
    seen, result = set(), []
    for row in rows:
        value = row.get(key)
        if value and value not in seen:
            seen.add(value)
            result.append(str(value))
    return '; '.join(result)


def advanced_protein_dict(p):
    d = model_to_dict(p)

    condensate_id = request.args.get('condensate_id', '').strip()
    disease_id = request.args.get('disease_id', '').strip()
    cmod_id = request.args.get('cmod_id', '').strip()
    pmid = request.args.get('pmid', '').strip()

    cond_q = db.session.query(Condensate).join(ProteinCondensate).filter(ProteinCondensate.protein_id == p.protein_id)
    if condensate_id:
        cond_q = cond_q.filter(Condensate.condensate_id == condensate_id)
    if disease_id:
        cond_q = cond_q.filter(exists().where(CondensateDisease.condensate_id == Condensate.condensate_id)
                                      .where(CondensateDisease.disease_id == disease_id))
    if cmod_id:
        cond_q = cond_q.filter(exists().where(CondensateCmod.condensate_id == Condensate.condensate_id)
                                      .where(CondensateCmod.cmod_id == cmod_id))
    if pmid:
        disease_cond_pmid = exists().where(CondensateDisease.condensate_id == Condensate.condensate_id) \
                                    .where(CondensateDisease.pmid.like(f'%{pmid}%'))
        cmod_cond_pmid = exists().where(CondensateCmod.condensate_id == Condensate.condensate_id) \
                                 .where(CondensateCmod.pmid.like(f'%{pmid}%'))
        cond_q = cond_q.filter(or_(disease_cond_pmid, cmod_cond_pmid))
    condensates = [model_to_dict(c) for c in cond_q.distinct().limit(30).all()]
    cond_ids = [c['condensate_id'] for c in condensates]

    disease_rows, cmod_rows, pmid_values = [], [], set()
    if cond_ids:
        disease_q = db.session.query(CondensateDisease, Disease).join(Disease).filter(CondensateDisease.condensate_id.in_(cond_ids))
        if disease_id:
            disease_q = disease_q.filter(CondensateDisease.disease_id == disease_id)
        if pmid:
            disease_q = disease_q.filter(CondensateDisease.pmid.like(f'%{pmid}%'))
        for cd, dis in disease_q.limit(50).all():
            disease_rows.append({'disease_name': dis.disease_name, 'pmid': cd.pmid})
            pmid_values.update(_split_pmids(cd.pmid))

        cmod_q = db.session.query(CondensateCmod, Cmod).join(Cmod).filter(CondensateCmod.condensate_id.in_(cond_ids))
        if cmod_id:
            cmod_q = cmod_q.filter(CondensateCmod.cmod_id == cmod_id)
        if pmid:
            cmod_q = cmod_q.filter(CondensateCmod.pmid.like(f'%{pmid}%'))
        for cc, cm in cmod_q.limit(50).all():
            cmod_rows.append({'cmod_name': cm.cmod_name, 'pmid': cc.pmid})
            pmid_values.update(_split_pmids(cc.pmid))

    d.update({
        'condensates': _join_names(condensates, 'condensate_name'),
        'diseases': _join_names(disease_rows, 'disease_name'),
        'chemical_modifications': _join_names(cmod_rows, 'cmod_name'),
        'pmids': ' | '.join(sorted(pmid_values)),
    })
    return d


def get_query(name):
    if name == 'kinases':
        q = Kinase.query.join(Protein)
        kw = request.args.get('keyword', '').strip()
        if kw:
            q = q.filter(or_(Kinase.entry_name.like(f'%{kw}%'), Kinase.organism_name.like(f'%{kw}%'),
                             Protein.uniprot_accession.like(f'%{kw}%'), Protein.gene_name.like(f'%{kw}%')))
        return q
    model, fields, _ = MODEL_MAP[name]
    q = model.query
    if name == 'users':
        q = q.filter(UserInfo.role == ROLE_USER)
    return apply_like(q, model, fields)


@bp.get('/admin-logs')
@jwt_required(ROLE_ADMIN)
def list_admin_logs():
    q = AdminLog.query
    kw = request.args.get('keyword', '').strip()
    if kw:
        q = q.filter(or_(AdminLog.admin_user.like(f'%{kw}%'), AdminLog.action_type.like(f'%{kw}%'),
                         AdminLog.target_table.like(f'%{kw}%'), AdminLog.target_id.like(f'%{kw}%')))
    action_type = request.args.get('action_type', '').strip()
    target_table = request.args.get('target_table', '').strip()
    if action_type:
        q = q.filter(AdminLog.action_type == action_type)
    if target_table:
        q = q.filter(AdminLog.target_table.like(f'%{target_table}%'))
    return ok(paginate_query(q.order_by(AdminLog.timestamp.desc(), AdminLog.log_id.desc())))


@bp.get('/search/advanced')
@jwt_required()
def advanced_search():
    protein_name = request.args.get('protein_name', '').strip()
    condensate_id = request.args.get('condensate_id', '').strip()
    disease_id = request.args.get('disease_id', '').strip()
    cmod_id = request.args.get('cmod_id', '').strip()
    pmid = request.args.get('pmid', '').strip()

    q = Protein.query
    if protein_name:
        q = q.filter(Protein.protein_name.like(f'%{protein_name}%'))

    need_condensate_join = bool(condensate_id or disease_id or cmod_id or pmid)
    if need_condensate_join:
        q = q.join(ProteinCondensate, Protein.protein_id == ProteinCondensate.protein_id) \
             .join(Condensate, ProteinCondensate.condensate_id == Condensate.condensate_id)
    if condensate_id:
        q = q.filter(Condensate.condensate_id == condensate_id)
    if disease_id:
        q = q.filter(exists().where(CondensateDisease.condensate_id == Condensate.condensate_id)
                            .where(CondensateDisease.disease_id == disease_id))
    if cmod_id:
        q = q.filter(exists().where(CondensateCmod.condensate_id == Condensate.condensate_id)
                            .where(CondensateCmod.cmod_id == cmod_id))
    if pmid:
        disease_pmid_exists = exists().where(CondensateDisease.condensate_id == Condensate.condensate_id) \
                                      .where(CondensateDisease.pmid.like(f'%{pmid}%'))
        cmod_pmid_exists = exists().where(CondensateCmod.condensate_id == Condensate.condensate_id) \
                                   .where(CondensateCmod.pmid.like(f'%{pmid}%'))
        q = q.filter(or_(disease_pmid_exists, cmod_pmid_exists))

    q = q.distinct().order_by(Protein.protein_id.asc())
    return ok(paginate_query(q, advanced_protein_dict))

@bp.get('/network')
@jwt_required()
def network_graph():
    """Return Cytoscape.js graph elements for the interactive network graph page."""
    keyword = request.args.get('keyword', '').strip()
    mode = request.args.get('mode', 'all').strip()
    try:
        limit = int(request.args.get('limit', 80))
    except ValueError:
        limit = 80
    limit = max(10, min(limit, 300))

    allowed_modes = {'all', 'protein_condensate', 'condensate_disease', 'condensate_cmod'}
    if mode not in allowed_modes:
        mode = 'all'

    nodes = {}
    edges = {}

    def add_node(node_id, label, node_type, **extra):
        if not label:
            label = node_id
        if node_id not in nodes:
            nodes[node_id] = {'data': {'id': node_id, 'weight': 1}}
        data = nodes[node_id]['data']
        data.update({'label': str(label), 'type': node_type})
        for key, value in extra.items():
            if value is not None:
                data[key] = value

    def add_edge(edge_id, source, target, label, edge_type, **extra):
        edges[edge_id] = {
            'data': {
                'id': edge_id,
                'source': source,
                'target': target,
                'label': label,
                'type': edge_type,
                **{k: v for k, v in extra.items() if v is not None}
            }
        }
        for node_id in (source, target):
            if node_id in nodes:
                nodes[node_id]['data']['weight'] = nodes[node_id]['data'].get('weight', 1) + 1

    if mode in {'all', 'protein_condensate'}:
        q = db.session.query(ProteinCondensate, Protein, Condensate) \
            .join(Protein, ProteinCondensate.protein_id == Protein.protein_id) \
            .join(Condensate, ProteinCondensate.condensate_id == Condensate.condensate_id) \
            .order_by(ProteinCondensate.protein_condensate_id.asc())
        if keyword:
            like = f'%{keyword}%'
            q = q.filter(or_(
                Protein.uniprot_accession.like(like),
                Protein.gene_name.like(like),
                Protein.protein_name.like(like),
                Protein.species_name.like(like),
                Condensate.condensate_uid.like(like),
                Condensate.condensate_name.like(like),
                Condensate.condensate_type.like(like),
                ProteinCondensate.evidence_source.like(like)
            ))
        for rel, protein, condensate in q.limit(limit).all():
            p_id = f'protein_{protein.protein_id}'
            c_id = f'condensate_{condensate.condensate_id}'
            add_node(p_id, protein.gene_name or protein.uniprot_accession, 'protein',
                     record_id=protein.protein_id, uniprot_accession=protein.uniprot_accession,
                     gene_name=protein.gene_name, protein_name=protein.protein_name,
                     species_name=protein.species_name)
            add_node(c_id, condensate.condensate_name, 'condensate',
                     record_id=condensate.condensate_id, condensate_uid=condensate.condensate_uid,
                     condensate_type=condensate.condensate_type,
                     confidence_score=str(condensate.confidence_score) if condensate.confidence_score is not None else None,
                     proteins_count=condensate.proteins_count)
            add_edge(f'pc_{rel.protein_condensate_id}', p_id, c_id, 'protein-condensate',
                     'protein_condensate', evidence_source=rel.evidence_source)

    if mode in {'all', 'condensate_disease'}:
        q = db.session.query(CondensateDisease, Condensate, Disease) \
            .join(Condensate, CondensateDisease.condensate_id == Condensate.condensate_id) \
            .join(Disease, CondensateDisease.disease_id == Disease.disease_id) \
            .order_by(CondensateDisease.condensate_disease_id.asc())
        if keyword:
            like = f'%{keyword}%'
            q = q.filter(or_(
                Condensate.condensate_uid.like(like),
                Condensate.condensate_name.like(like),
                Condensate.condensate_type.like(like),
                Disease.disease_name.like(like),
                CondensateDisease.dysregulation_type.like(like),
                CondensateDisease.condensate_markers.like(like),
                CondensateDisease.pmid.like(like)
            ))
        for rel, condensate, disease in q.limit(limit).all():
            c_id = f'condensate_{condensate.condensate_id}'
            d_id = f'disease_{disease.disease_id}'
            add_node(c_id, condensate.condensate_name, 'condensate',
                     record_id=condensate.condensate_id, condensate_uid=condensate.condensate_uid,
                     condensate_type=condensate.condensate_type,
                     confidence_score=str(condensate.confidence_score) if condensate.confidence_score is not None else None,
                     proteins_count=condensate.proteins_count)
            add_node(d_id, disease.disease_name, 'disease', record_id=disease.disease_id,
                     disease_name=disease.disease_name)
            add_edge(f'cd_{rel.condensate_disease_id}', c_id, d_id, 'condensate-disease',
                     'condensate_disease', dysregulation_type=rel.dysregulation_type,
                     condensate_markers=rel.condensate_markers, pmid=rel.pmid)

    if mode in {'all', 'condensate_cmod'}:
        q = db.session.query(CondensateCmod, Condensate, Cmod) \
            .join(Condensate, CondensateCmod.condensate_id == Condensate.condensate_id) \
            .join(Cmod, CondensateCmod.cmod_id == Cmod.cmod_id) \
            .order_by(CondensateCmod.condensate_cmod_id.asc())
        if keyword:
            like = f'%{keyword}%'
            q = q.filter(or_(
                Condensate.condensate_uid.like(like),
                Condensate.condensate_name.like(like),
                Condensate.condensate_type.like(like),
                Cmod.cmod_name.like(like),
                Cmod.biomolecular_type.like(like),
                Cmod.phenotypic_class.like(like),
                CondensateCmod.pmid.like(like)
            ))
        for rel, condensate, cmod in q.limit(limit).all():
            c_id = f'condensate_{condensate.condensate_id}'
            cm_id = f'cmod_{cmod.cmod_id}'
            add_node(c_id, condensate.condensate_name, 'condensate',
                     record_id=condensate.condensate_id, condensate_uid=condensate.condensate_uid,
                     condensate_type=condensate.condensate_type,
                     confidence_score=str(condensate.confidence_score) if condensate.confidence_score is not None else None,
                     proteins_count=condensate.proteins_count)
            add_node(cm_id, cmod.cmod_name, 'cmod', record_id=cmod.cmod_id,
                     cmod_name=cmod.cmod_name, biomolecular_type=cmod.biomolecular_type,
                     phenotypic_class=cmod.phenotypic_class)
            add_edge(f'cc_{rel.condensate_cmod_id}', c_id, cm_id, 'condensate-cmod',
                     'condensate_cmod', pmid=rel.pmid)

    return ok({
        'nodes': list(nodes.values()),
        'edges': list(edges.values()),
        'elements': list(nodes.values()) + list(edges.values()),
        'summary': {
            'node_count': len(nodes),
            'edge_count': len(edges),
            'keyword': keyword,
            'mode': mode,
            'limit': limit
        }
    })


@bp.get('/<name>')
@jwt_required()
def list_data(name):
    if name not in MODEL_MAP: return fail('Unknown resource')
    serializer = kinase_dict if name == 'kinases' else model_to_dict
    return ok(paginate_query(get_query(name), serializer))


@bp.get('/<name>/export')
@jwt_required()
def export_data(name):
    if name not in MODEL_MAP: return fail('Unknown resource')
    rows = [(kinase_dict(x) if name == 'kinases' else model_to_dict(x)) for x in get_query(name).limit(5000).all()]
    return export_rows(rows, COLUMNS[name], name, request.args.get('type', 'csv'))


@bp.post('/<name>')
@jwt_required(ROLE_ADMIN)
def create_data(name):
    if name not in MODEL_MAP: return fail('Unknown resource')
    model, _, pk = MODEL_MAP[name]
    data = clean_data(request.get_json() or {})
    if name == 'users':
        data['role'] = ROLE_USER
        data['status'] = 1
        data['create_time'] = datetime.now()
    if name == 'publications' and not data.get('pmid'):
        return fail('PMID is required')
    if name == 'kinases' and not data.get('protein_id'):
        return fail('Protein is required')
    filtered = {k: v for k, v in data.items() if hasattr(model, k)}
    if name in AUTO_PK:
        filtered.pop(pk, None)
    try:
        obj = model(**filtered)
        db.session.add(obj)
        db.session.flush()
        write_admin_log('CREATE', model.__tablename__, getattr(obj, pk, None))
        db.session.commit()
        return ok(model_to_dict(obj), 'Created successfully')
    except IntegrityError as e:
        db.session.rollback()
        return fail('Duplicate or invalid data: ' + str(e.orig))


@bp.put('/<name>/<id>')
@jwt_required(ROLE_ADMIN)
def update_data(name, id):
    if name not in MODEL_MAP: return fail('Unknown resource')
    model, _, pk = MODEL_MAP[name]
    obj = model.query.get(id)
    if not obj: return fail('Record not found', 404)
    for k, v in clean_data(request.get_json() or {}).items():
        if hasattr(obj, k) and k != pk:
            setattr(obj, k, v)
    write_admin_log('UPDATE', model.__tablename__, id)
    db.session.commit()
    return ok(model_to_dict(obj), 'Updated successfully')


@bp.delete('/<name>/<id>')
@jwt_required(ROLE_ADMIN)
def delete_data(name, id):
    if name not in MODEL_MAP: return fail('Unknown resource')
    model, _, _ = MODEL_MAP[name]
    obj = model.query.get(id)
    if not obj: return fail('Record not found', 404)
    write_admin_log('DELETE', model.__tablename__, id)
    db.session.delete(obj)
    db.session.commit()
    return ok(msg='Deleted successfully')


@bp.put('/users/<id>/toggle')
@jwt_required(ROLE_ADMIN)
def toggle_user(id):
    user = UserInfo.query.get(id)
    if not user: return fail('User not found', 404)
    user.status = 0 if user.status == 1 else 1
    write_admin_log('UPDATE', UserInfo.__tablename__, id)
    db.session.commit()
    return ok(model_to_dict(user, exclude={'password'}), 'Status updated')


@bp.get('/proteins/<pid>/condensates')
@jwt_required()
def protein_condensates(pid):
    rows = db.session.query(ProteinCondensate, Condensate).join(Condensate).filter(
        ProteinCondensate.protein_id == pid).all()
    return ok(
        [dict(model_to_dict(c), protein_condensate_id=pc.protein_condensate_id, evidence_source=pc.evidence_source) for
         pc, c in rows])


@bp.get('/condensates/<cid>/proteins')
@jwt_required()
def condensate_proteins(cid):
    rows = db.session.query(ProteinCondensate, Protein).join(Protein).filter(
        ProteinCondensate.condensate_id == cid).all()
    return ok(
        [dict(model_to_dict(p), protein_condensate_id=pc.protein_condensate_id, evidence_source=pc.evidence_source) for
         pc, p in rows])


@bp.get('/condensates/<cid>/diseases')
@jwt_required()
def condensate_diseases(cid):
    rows = db.session.query(CondensateDisease, Disease).join(Disease).filter(
        CondensateDisease.condensate_id == cid).all()
    return ok([dict(model_to_dict(d), condensate_disease_id=cd.condensate_disease_id,
                    dysregulation_type=cd.dysregulation_type, condensate_markers=cd.condensate_markers, pmid=cd.pmid)
               for cd, d in rows])


@bp.get('/condensates/<cid>/cmods')
@jwt_required()
def condensate_cmods(cid):
    rows = db.session.query(CondensateCmod, Cmod).join(Cmod).filter(CondensateCmod.condensate_id == cid).all()
    return ok([dict(model_to_dict(m), condensate_cmod_id=cc.condensate_cmod_id, pmid=cc.pmid) for cc, m in rows])


@bp.get('/diseases/<did>/condensates')
@jwt_required()
def disease_condensates(did):
    rows = db.session.query(CondensateDisease, Condensate).join(Condensate).filter(
        CondensateDisease.disease_id == did).all()
    return ok([dict(model_to_dict(c), condensate_disease_id=cd.condensate_disease_id,
                    dysregulation_type=cd.dysregulation_type, condensate_markers=cd.condensate_markers, pmid=cd.pmid)
               for cd, c in rows])


@bp.get('/cmods/<mid>/condensates')
@jwt_required()
def cmod_condensates(mid):
    rows = db.session.query(CondensateCmod, Condensate).join(Condensate).filter(CondensateCmod.cmod_id == mid).all()
    return ok([dict(model_to_dict(c), condensate_cmod_id=cc.condensate_cmod_id, pmid=cc.pmid) for cc, c in rows])


@bp.get('/publications/<pmid>/evidence')
@jwt_required()
def publication_evidence(pmid):
    disease = db.session.query(CondensateDisease, Condensate, Disease).join(Condensate).join(Disease).filter(
        CondensateDisease.pmid.like(f'%{pmid}%')).all()
    cmod = db.session.query(CondensateCmod, Condensate, Cmod).join(Condensate).join(Cmod).filter(
        CondensateCmod.pmid.like(f'%{pmid}%')).all()
    return ok({
        'disease_relations': [{'condensate_name': c.condensate_name, 'disease_name': d.disease_name,
                               'dysregulation_type': cd.dysregulation_type, 'condensate_markers': cd.condensate_markers,
                               'pmid': cd.pmid} for cd, c, d in disease],
        'cmod_relations': [{'condensate_name': c.condensate_name, 'cmod_name': m.cmod_name, 'pmid': cc.pmid} for
                           cc, c, m in cmod]
    })


@bp.post('/relations/protein-condensate')
@jwt_required(ROLE_ADMIN)
def add_pc():
    data = clean_data(request.get_json() or {})
    obj = ProteinCondensate(**data)
    db.session.add(obj)
    db.session.flush()
    write_admin_log('CREATE', ProteinCondensate.__tablename__, obj.protein_condensate_id)
    db.session.commit()
    return ok(model_to_dict(obj), 'Relation created')


@bp.delete('/relations/protein-condensate/<rid>')
@jwt_required(ROLE_ADMIN)
def del_pc(rid):
    obj = ProteinCondensate.query.get(rid)
    if not obj: return fail('Relation not found', 404)
    write_admin_log('DELETE', ProteinCondensate.__tablename__, rid)
    db.session.delete(obj)
    db.session.commit()
    return ok(msg='Relation deleted')


@bp.post('/relations/condensate-cmod')
@jwt_required(ROLE_ADMIN)
def add_cc():
    data = clean_data(request.get_json() or {})
    obj = CondensateCmod(**data)
    db.session.add(obj)
    db.session.flush()
    write_admin_log('CREATE', CondensateCmod.__tablename__, obj.condensate_cmod_id)
    db.session.commit()
    return ok(model_to_dict(obj), 'Relation created')


@bp.delete('/relations/condensate-cmod/<rid>')
@jwt_required(ROLE_ADMIN)
def del_cc(rid):
    obj = CondensateCmod.query.get(rid)
    if not obj: return fail('Relation not found', 404)
    write_admin_log('DELETE', CondensateCmod.__tablename__, rid)
    db.session.delete(obj)
    db.session.commit()
    return ok(msg='Relation deleted')


@bp.post('/relations/condensate-disease')
@jwt_required(ROLE_ADMIN)
def add_cd():
    data = clean_data(request.get_json() or {})
    obj = CondensateDisease(**data)
    db.session.add(obj)
    db.session.flush()
    write_admin_log('CREATE', CondensateDisease.__tablename__, obj.condensate_disease_id)
    db.session.commit()
    return ok(model_to_dict(obj), 'Relation created')


@bp.delete('/relations/condensate-disease/<rid>')
@jwt_required(ROLE_ADMIN)
def del_cd(rid):
    obj = CondensateDisease.query.get(rid)
    if not obj: return fail('Relation not found', 404)
    write_admin_log('DELETE', CondensateDisease.__tablename__, rid)
    db.session.delete(obj)
    db.session.commit()
    return ok(msg='Relation deleted')


@bp.get('/stats/summary')
@jwt_required()
def stats_summary():
    return ok({
        'protein_total': Protein.query.count(), 'kinase_total': Kinase.query.count(),
        'condensate_total': Condensate.query.count(),
        'disease_total': Disease.query.count(), 'publication_total': Publication.query.count(),
        'cmod_total': Cmod.query.count(),
        'user_total': UserInfo.query.count(), 'normal_user_total': UserInfo.query.filter_by(role=ROLE_USER).count(),
        'admin_total': UserInfo.query.filter_by(role=ROLE_ADMIN).count(),
        'disabled_user_total': UserInfo.query.filter_by(status=0).count()
    })


@bp.get('/stats/charts')
@jwt_required()
def stats_charts():
    type_count = db.session.query(Condensate.condensate_type, func.count()).group_by(Condensate.condensate_type).all()
    disease_count = db.session.query(Disease.disease_name, func.count(CondensateDisease.condensate_id)).join(
        CondensateDisease).group_by(Disease.disease_name).order_by(
        func.count(CondensateDisease.condensate_id).desc()).limit(10).all()
    species_count = db.session.query(Condensate.species_tax_id, func.count()).group_by(Condensate.species_tax_id).limit(
        10).all()
    cmod_count = db.session.query(Cmod.biomolecular_type, func.count()).group_by(Cmod.biomolecular_type).all()
    protein_rank = Protein.query.order_by(
        (Protein.biomolecular_condensate_count + Protein.synthetic_condensate_count).desc()).limit(10).all()
    return ok({
        'condensate_type': [{'name': str(k), 'value': v} for k, v in type_count],
        'disease_rank': [{'name': k, 'value': v} for k, v in disease_count],
        'species_count': [{'name': str(k), 'value': v} for k, v in species_count],
        'cmod_type': [{'name': str(k), 'value': v} for k, v in cmod_count],
        'protein_rank': [{'name': p.gene_name or p.uniprot_accession,
                          'value': (p.biomolecular_condensate_count or 0) + (p.synthetic_condensate_count or 0)} for p
                         in protein_rank]
    })


@bp.get('/options/<name>')
@jwt_required()
def options(name):
    mapping = {'proteins': (Protein, 'protein_id', 'uniprot_accession'),
               'condensates': (Condensate, 'condensate_id', 'condensate_name'),
               'diseases': (Disease, 'disease_id', 'disease_name'), 'cmods': (Cmod, 'cmod_id', 'cmod_name'),
               'publications': (Publication, 'pmid', 'pmid')}
    if name not in mapping: return fail('Unknown option')
    model, value, label = mapping[name]
    rows = model.query.limit(5000).all()
    return ok([{'value': getattr(x, value), 'label': getattr(x, label)} for x in rows])
