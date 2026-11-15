"""Independent original-source qualification for existing XML ATTA defaults."""
import re


def attachment_policy(config):
    if 'xml229SourceAttachmentPolicy' not in config:
        return False
    p=config['xml229SourceAttachmentPolicy']
    if p!={'schema':'XML229.SourceAttachmentPolicy.v1',
           'unclassifiedAtta':'existing-xml-default'}:
        raise ValueError('NATIVE_V2_ATTACHMENT_POLICY_INVALID')
    if not config.get('xml229SourceCoordinatePolicy'):
        raise ValueError('NATIVE_V2_ATTACHMENT_POLICY_COORDINATES_REQUIRED')
    return True


def generic_attachment_node(member, rows, branches, field):
    original=member['attrs'];attrs={}
    for key,value in original.items():
        k=key.upper()
        if k in attrs:
            return None
        attrs[k]=value
    text=lambda k:str(attrs.get(k) if attrs.get(k) is not None else '').strip()
    if text('TYPE')!='ATTA' or text('RAW_TYPE')!='ATTA':
        return None
    if not re.fullmatch(r'=\d+/\d+',text('NAME')) or text('NAME')!=text('REF'):
        return None
    if not re.search(r'(?:^|/)ATTA-\d+(?:\.\d+)?$',text('SPRE'),re.I):
        return None
    stress=('NODETYPE','NODEGAP','CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS',
            'STIFFNESS','NODESTIFFNESS','NODESTIFF','FRICTION','NODEFRICTION',
            'DIRECTIONCOSINEX','DIRECTIONCOSINEY','DIRECTIONCOSINEZ',
            'NODEDIRX','NODEDIRY','NODEDIRZ','MDSSUPPTYPE','CMPSUPTYPE',
            'SUPPORT_KIND','SUPPORT_MAPPER_KIND','SUPPORT_TYPE','MDSSUPPFUNC','CMPSTRESSN')
    descriptions=('DTXR','DESC','DESCRIPTION','MDSDTXR','MDSDTXS','MDSDTXT','ISONOTE','RTEXT')
    if any(text(k) for k in stress) or any(text(k) not in ('','---') for k in descriptions):
        return None
    norm=lambda s:str(s).strip().upper().removeprefix('/')
    matches=[(b,i,n) for b,i,n in rows if field(n,'ComponentType')=='ATTA'
             and not field(n,'NodeName') and field(n,'ComponentRefNo')==text('REF')
             and norm(field(branches[b],'Branchname'))==norm(member['branch'])]
    return matches[0] if len(matches)==1 else None
