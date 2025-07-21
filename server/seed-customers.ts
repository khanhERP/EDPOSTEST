
import { db } from "./db";
import { customers } from "@shared/schema";

const sampleCustomers = [
  {
    customerId: "CUS001",
    name: "김철수",
    phone: "010-1234-5678",
    email: "kim.cs@email.com",
    address: "서울시 강남구 역삼동 123-45",
    birthDate: "1985-03-15",
    grade: "gold" as const,
    notes: "단골고객, 매운 음식 선호"
  },
  {
    customerId: "CUS002", 
    name: "이영희",
    phone: "010-2345-6789",
    email: "lee.yh@email.com",
    address: "서울시 서초구 서초동 234-56",
    birthDate: "1990-07-22",
    grade: "silver" as const,
    notes: "알레르기 주의 - 견과류"
  },
  {
    customerId: "CUS003",
    name: "박민수",
    phone: "010-3456-7890",
    email: "park.ms@email.com", 
    address: "서울시 송파구 잠실동 345-67",
    birthDate: "1988-11-08",
    grade: "vip" as const,
    notes: "VIP 고객, 특별 서비스 제공"
  },
  {
    customerId: "CUS004",
    name: "최수진",
    phone: "010-4567-8901",
    email: "choi.sj@email.com",
    address: "서울시 마포구 홍대동 456-78",
    birthDate: "1992-05-12",
    grade: "bronze" as const,
    notes: "카페 메뉴 선호"
  },
  {
    customerId: "CUS005",
    name: "정현우",
    phone: "010-5678-9012",
    email: "jung.hw@email.com",
    address: "서울시 용산구 이태원동 567-89",
    birthDate: "1987-09-30",
    grade: "gold" as const,
    notes: "저녁 시간대 단골"
  },
  {
    customerId: "CUS006",
    name: "한미영",
    phone: "010-6789-0123",
    email: "han.my@email.com",
    address: "서울시 종로구 인사동 678-90",
    birthDate: "1983-01-18",
    grade: "silver" as const,
    notes: "가족 단위 방문 많음"
  },
  {
    customerId: "CUS007",
    name: "윤태호",
    phone: "010-7890-1234",
    email: "yoon.th@email.com",
    address: "서울시 강서구 화곡동 789-01",
    birthDate: "1991-12-25",
    grade: "bronze" as const,
    notes: "배달 주문 선호"
  },
  {
    customerId: "CUS008",
    name: "장소라",
    phone: "010-8901-2345",
    email: "jang.sr@email.com",
    address: "서울시 노원구 상계동 890-12",
    birthDate: "1989-04-07",
    grade: "gold" as const,
    notes: "디저트 메뉴 자주 주문"
  },
  {
    customerId: "CUS009",
    name: "오준석",
    phone: "010-9012-3456",
    email: "oh.js@email.com",
    address: "서울시 관악구 신림동 901-23",
    birthDate: "1986-08-14",
    grade: "vip" as const,
    notes: "비즈니스 미팅 자주 이용"
  },
  {
    customerId: "CUS010",
    name: "임하늘",
    phone: "010-0123-4567",
    email: "lim.hn@email.com",
    address: "서울시 동작구 사당동 012-34",
    birthDate: "1993-06-03",
    grade: "silver" as const,
    notes: "건강식 메뉴 선호"
  },
  {
    customerId: "CUS011",
    name: "신동엽",
    phone: "010-1357-2468",
    email: "shin.dy@email.com",
    address: "서울시 성북구 성신동 135-79",
    birthDate: "1984-10-20",
    grade: "bronze" as const,
    notes: "주말 브런치 단골"
  },
  {
    customerId: "CUS012",
    name: "강유미",
    phone: "010-2468-1357",
    email: "kang.ym@email.com",
    address: "서울시 중구 명동 246-81",
    birthDate: "1988-02-14",
    grade: "gold" as const,
    notes: "기념일 예약 자주 함"
  },
  {
    customerId: "CUS013",
    name: "조현민",
    phone: "010-3691-4725",
    email: "cho.hm@email.com",
    address: "서울시 영등포구 여의도동 369-14",
    birthDate: "1990-11-28",
    grade: "silver" as const,
    notes: "점심시간 단골 고객"
  },
  {
    customerId: "CUS014",
    name: "유승호",
    phone: "010-4826-3951",
    email: "yoo.sh@email.com",
    address: "서울시 광진구 자양동 482-63",
    birthDate: "1987-07-11",
    grade: "vip" as const,
    notes: "회식 자주 예약"
  },
  {
    customerId: "CUS015",
    name: "백설아",
    phone: "010-5937-2846",
    email: "baek.sa@email.com",
    address: "서울시 성동구 성수동 593-72",
    birthDate: "1991-09-05",
    grade: "bronze" as const,
    notes: "테이크아웃 주문 많음"
  },
  {
    customerId: "CUS016",
    name: "서준혁",
    phone: "010-6148-5372",
    email: "seo.jh@email.com",
    address: "서울시 도봉구 창동 614-85",
    birthDate: "1985-12-01",
    grade: "gold" as const,
    notes: "와인 페어링 관심 많음"
  },
  {
    customerId: "CUS017",
    name: "노예지",
    phone: "010-7259-6483",
    email: "noh.yj@email.com",
    address: "서울시 강북구 수유동 725-96",
    birthDate: "1989-03-17",
    grade: "silver" as const,
    notes: "채식 메뉴 선호"
  },
  {
    customerId: "CUS018",
    name: "홍길동",
    phone: "010-8370-7594",
    email: "hong.gd@email.com",
    address: "서울시 은평구 응암동 837-07",
    birthDate: "1986-05-23",
    grade: "bronze" as const,
    notes: "포장 주문 선호"
  },
  {
    customerId: "CUS019",
    name: "송지효",
    phone: "010-9481-8605",
    email: "song.jh@email.com",
    address: "서울시 서대문구 신촌동 948-18",
    birthDate: "1992-08-09",
    grade: "gold" as const,
    notes: "친구들과 자주 방문"
  },
  {
    customerId: "CUS020",
    name: "김태리",
    phone: "010-0592-9716",
    email: "kim.tr@email.com",
    address: "서울시 동대문구 회기동 059-29",
    birthDate: "1990-01-26",
    grade: "vip" as const,
    notes: "프리미엄 메뉴 선호"
  }
];

export async function seedCustomers() {
  try {
    console.log("Seeding customer data...");
    
    for (const customer of sampleCustomers) {
      await db.insert(customers).values({
        ...customer,
        totalSpent: "0",
        visitCount: 0,
      });
    }
    
    console.log(`Successfully seeded ${sampleCustomers.length} customers`);
  } catch (error) {
    console.error("Error seeding customers:", error);
    throw error;
  }
}

if (require.main === module) {
  seedCustomers()
    .then(() => {
      console.log("Customer seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Customer seeding failed:", error);
      process.exit(1);
    });
}
