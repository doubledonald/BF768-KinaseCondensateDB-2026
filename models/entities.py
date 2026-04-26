from datetime import datetime
from exts import db


class UserInfo(db.Model):
    __tablename__ = 'user_info'
    user_id = db.Column(db.BigInteger, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    gender = db.Column(db.String(10))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100), unique=True)
    role = db.Column(db.String(50), nullable=False, default='user')
    status = db.Column(db.SmallInteger, nullable=False, default=1)
    create_time = db.Column(db.DateTime, default=datetime.now)


class AdminLog(db.Model):
    __tablename__ = 'admin_log'
    log_id = db.Column(db.BigInteger, primary_key=True)
    admin_user = db.Column(db.String(64), nullable=False)
    action_type = db.Column(db.String(16), nullable=False)
    target_table = db.Column(db.String(64), nullable=False)
    target_id = db.Column(db.String(64))
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.now)


class Protein(db.Model):
    __tablename__ = 'protein'
    protein_id = db.Column(db.BigInteger, primary_key=True)
    uniprot_accession = db.Column(db.String(64), unique=True, nullable=False)
    gene_name = db.Column(db.String(255))
    protein_name = db.Column(db.Text)
    species_name = db.Column(db.String(255))
    biomolecular_condensate_count = db.Column(db.Integer, default=0)
    synthetic_condensate_count = db.Column(db.Integer, default=0)


class Kinase(db.Model):
    __tablename__ = 'kinase'
    protein_id = db.Column(db.BigInteger, db.ForeignKey('protein.protein_id'), primary_key=True)
    entry_name = db.Column(db.String(255))
    organism_name = db.Column(db.String(255))
    sequence_length = db.Column(db.Integer)
    sequence = db.Column(db.Text)
    reviewed_flag = db.Column(db.SmallInteger, default=1)
    protein = db.relationship('Protein')


class Condensate(db.Model):
    __tablename__ = 'condensate'
    condensate_id = db.Column(db.BigInteger, primary_key=True)
    condensate_uid = db.Column(db.String(64), unique=True, nullable=False)
    condensate_name = db.Column(db.String(255), nullable=False)
    condensate_type = db.Column(db.String(255))
    species_tax_id = db.Column(db.Integer)
    proteins_count = db.Column(db.Integer, default=0)
    has_dna = db.Column(db.SmallInteger, default=0)
    has_rna = db.Column(db.SmallInteger, default=0)
    has_cmods = db.Column(db.SmallInteger, default=0)
    has_condensatopathy = db.Column(db.SmallInteger, default=0)
    confidence_score = db.Column(db.Numeric(10, 2))


class Disease(db.Model):
    __tablename__ = 'disease'
    disease_id = db.Column(db.BigInteger, primary_key=True)
    disease_name = db.Column(db.String(255), unique=True, nullable=False)


class Cmod(db.Model):
    __tablename__ = 'cmod'
    cmod_id = db.Column(db.BigInteger, primary_key=True)
    cmod_name = db.Column(db.String(255), unique=True, nullable=False)
    biomolecular_type = db.Column(db.String(255))
    phenotypic_class = db.Column(db.String(255))


class Publication(db.Model):
    __tablename__ = 'publication'
    pmid = db.Column(db.String(128), primary_key=True)


class ProteinCondensate(db.Model):
    __tablename__ = 'protein_condensate'
    protein_condensate_id = db.Column(db.BigInteger, primary_key=True)
    protein_id = db.Column(db.BigInteger, db.ForeignKey('protein.protein_id'), nullable=False)
    condensate_id = db.Column(db.BigInteger, db.ForeignKey('condensate.condensate_id'), nullable=False)
    evidence_source = db.Column(db.String(255), default='protein2cdcode_v2.1.tsv')
    protein = db.relationship('Protein')
    condensate = db.relationship('Condensate')


class CondensateCmod(db.Model):
    __tablename__ = 'condensate_cmod'
    condensate_cmod_id = db.Column(db.BigInteger, primary_key=True)
    condensate_id = db.Column(db.BigInteger, db.ForeignKey('condensate.condensate_id'), nullable=False)
    cmod_id = db.Column(db.BigInteger, db.ForeignKey('cmod.cmod_id'), nullable=False)
    pmid = db.Column(db.String(128), db.ForeignKey('publication.pmid'))
    condensate = db.relationship('Condensate')
    cmod = db.relationship('Cmod')


class CondensateDisease(db.Model):
    __tablename__ = 'condensate_disease'
    condensate_disease_id = db.Column(db.BigInteger, primary_key=True)
    condensate_id = db.Column(db.BigInteger, db.ForeignKey('condensate.condensate_id'), nullable=False)
    disease_id = db.Column(db.BigInteger, db.ForeignKey('disease.disease_id'), nullable=False)
    dysregulation_type = db.Column(db.Text)
    condensate_markers = db.Column(db.Text)
    pmid = db.Column(db.String(128), db.ForeignKey('publication.pmid'))
    condensate = db.relationship('Condensate')
    disease = db.relationship('Disease')
